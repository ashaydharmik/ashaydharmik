'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PrimitiveAtom, useAtom } from 'jotai';
import {
  formDataAtom,
  SurveyForm,
  OptionType,
  currentStepAtom,
  editingSurveyFormIdAtom,
  surveyForm,
  editAtom,
} from '@/atoms/surveyModuleAtom';
import { getLanguage, getUserData } from '@/config/auth';
import {
  useSurveyTypeDetailsQuery,
  useSurveyNatureDetailsQuery,
  useSurveyInitiatedByDetailsQuery,
  useSurveySummaryByKeyQuery,
} from '@/framework/rest/CreateSurvey/createSurvey.query';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import {
  Input,
  Textarea,
  Select,
  Text,
  RadioGroup,
  Radio,
  Button,
} from 'rizzui';
import { DatePicker } from '@/components/ui/datepicker';
import { PiArrowRightBold } from 'react-icons/pi';

export const SurveyFormStep = ({ onClose }) => {
  const [formData, setFormData] = useAtom(formDataAtom);
  const [currentStep, setCurrentStep] = useAtom(currentStepAtom);
  const [isEditMode, setIsEditMode] = useAtom(editAtom);
  const userData = getUserData() as any;
  const {
    control,
    watch,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SurveyForm>({
    defaultValues: {
      sdCode: '',
      sdNameP: '',
      sdSurveyType: null,
      sdSurveyNature: null,
      sdInitiatedBy: null,
      sdStartDate: new Date(),
      sdDueDate: new Date(),
      sdDescP: '',
      sdDesc1P: '',
      sdSurveyMandYN: 'N',
    },
  });

  const [selectedInitiatedBy, setSelectedInitiatedBy] =
    useState<OptionType | null>(null);
  const [initiatedBySearchText, setInitiatedBySearchText] = useState('');
  const [debouncedInitiatedBySearchText, setDebouncedInitiatedBySearchText] =
    useState('');
  const [selectedSurveyFormId, setSelectedSurveyFormId] = useAtom(
    editingSurveyFormIdAtom as PrimitiveAtom<surveyForm>
  );

  console.log('selectedSurveyForm', selectedSurveyFormId);

  const lang = getLanguage();
  const params = { lang, companyKey: 1 };
  const settings = {
    enabled: true,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  };

  const surveyDataByKeyParams = {
    lang,
    companyKey: 1,
    sdKey: selectedSurveyFormId,
  };

  const surveyDataByKeySettings = {
    enabled: !!selectedSurveyFormId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  };

  const { data: surveyDataByKey } = useSurveySummaryByKeyQuery(
    surveyDataByKeyParams,
    surveyDataByKeySettings
  );
  console.log('surveyDataByKey', surveyDataByKey);

  const { data: surveyTypeDropdownData } = useSurveyTypeDetailsQuery(
    params,
    settings
  );
  const { data: surveyNatureDropdownData } = useSurveyNatureDetailsQuery(
    params,
    settings
  );
  const { data: surveyInitiatedByDropdownData } =
    useSurveyInitiatedByDetailsQuery(params, {
      ...settings,
      enabled: !!debouncedInitiatedBySearchText,
    });

  const surveyTypeOption =
    surveyTypeDropdownData?.map((o: any) => ({
      label: o.stNameP || o.stNameS,
      value: o.stKey.toString(),
    })) || [];
  const surveyNatureOption =
    surveyNatureDropdownData?.map((o: any) => ({
      label: o.text,
      value: o.id.toString(),
    })) || [];
  const surveyInitiatedByOption =
    surveyInitiatedByDropdownData?.map((o: any) => ({
      label: o.oldtDescP || o.oldtDescS,
      value: o.oldtKey.toString(),
    })) || [];

  useEffect(() => {
    const timer = setTimeout(
      () =>
        setDebouncedInitiatedBySearchText(
          initiatedBySearchText.trim().toLowerCase()
        ),
      500
    );
    return () => clearTimeout(timer);
  }, [initiatedBySearchText]);

  const populateFormForEdit = useCallback(
    (record: any) => {
      console.log('record', record);
      
      // Find dropdown options by Key
      const typeOption = surveyTypeOption.find(
        (option) => option.value === record.sdSurveyTypeKey?.toString()
      );
      const natureOption = surveyNatureOption.find(
        (option) => option.value === record.sdSurveyNatureKey?.toString()
      );
      const initiatedByOption = surveyInitiatedByOption.find(
        (option) => option.value === record.sdInitiatedBy?.toString()
      );

      // Set form values directly without setTimeout
      setValue('sdCode', record.sdCode || '');
      setValue('sdNameP', record.sdNameP || '');

      // Dropdowns
      if (typeOption) {
        setValue('sdSurveyType', typeOption);
      }
      if (natureOption) {
        setValue('sdSurveyNature', natureOption);
      }
      
      // Autocomplete (Initiated By)
      if (initiatedByOption) {
        setSelectedInitiatedBy(initiatedByOption); // UI display
        setValue('sdInitiatedBy', initiatedByOption.value); // RHF form value
      } else if (record.sdInitiatedBy && record.sdInitiatedByDescP) {
        // In case not in options list
        const custom = {
          value: record.sdInitiatedBy.toString(),
          label: record.sdInitiatedByDescP,
        };
        setSelectedInitiatedBy(custom);
        setValue('sdInitiatedBy', custom.value);
      }

      // Dates
      const parseDMY = (dateStr?: string): Date | null => {
        if (!dateStr) return null;
        const parsed = dayjs(dateStr, 'DD/MM/YYYY'); // strict mode
        return parsed.isValid()
          ? new Date(parsed.date(), parsed.month(), parsed.year()) // avoids timezone shift
          : null;
      };

      const startDate = parseDMY(record.sdStartDate);
      const dueDate = parseDMY(record.sdDueDate);

      if (startDate) {
        setValue('sdStartDate', startDate);
      }
      if (dueDate) {
        setValue('sdDueDate', dueDate);
      }

      // Purpose & Notes
      setValue('sdDescP', record.sdDescP || '');
      setValue('sdDesc1P', record.sdDesc1P || '');

      // Mandatory
      setValue('sdSurveyMandYN', record.sdSurveyMandYn || 'N');
    },
    [setValue, surveyTypeOption, surveyNatureOption, surveyInitiatedByOption]
  );

  useEffect(() => {
    if (isEditMode && surveyDataByKey) {
      populateFormForEdit(surveyDataByKey);
    }
  }, [isEditMode, surveyDataByKey, populateFormForEdit]);

  const onNext = (data: SurveyForm) => {
    // Prepare the object in the required format
    const updatedFormData = {
      ...formData,
      sdKey: isEditMode ? surveyDataByKey.sdKey : 0,
      companyKey: 1,
      sdCode: data.sdCode,
      sdNameP: data.sdNameP,
      sdNameS: '',
      sdSurveyType: Number(data.sdSurveyType.value),
      sdSurveyNature: Number(data.sdSurveyNature.value),
      sdInitiatedBy: Number(data.sdInitiatedBy),
      sdCatgKey: '',
      activeYN: 'I',
      sdStartDate: dayjs(data.sdStartDate).format('DD/MM/YYYY'),
      sdDueDate: dayjs(data.sdDueDate).format('DD/MM/YYYY'),
      createdUser: userData.currentUserKey,
      createdDateTime: dayjs(data.createdDateTime).format(
        'DD/MM/YYYY hh:mm:ss A'
      ),
      updatedUser: '',
      updatedDateTime: '',
      sdDescP: data.sdDescP,
      sdDescS: '',
      sdEntryType: '',
      sdDesc1P: data.sdDesc1P,
      sdDesc2S: '',
      sdSeqNo: 1,
      sdCompletedYN: 'N',
      sdSurveyMandYN: data.sdSurveyMandYN,
    };

    // Save in atom
    setFormData(updatedFormData);

    // Move to next step
    setCurrentStep(currentStep + 1);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onNext)}>
      {/* Survey Reference & Name */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Survey Reference <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdCode"
            control={control}
            rules={{ required: 'Survey Reference is required' }}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="e.g., CUST-FB-2024-001"
                error={errors.sdCode?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Survey Name <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdNameP"
            control={control}
            rules={{ required: 'Survey Name is required' }}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="e.g., Q1 Product Feedback"
                error={errors.sdNameP?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Survey Type & Nature */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Survey Type <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdSurveyType"
            control={control}
            rules={{ required: 'Survey Type is required' }}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select Type"
                options={surveyTypeOption}
                error={errors.sdSurveyType?.message}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Survey Nature <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdSurveyNature"
            control={control}
            rules={{ required: 'Survey Nature is required' }}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select Nature"
                options={surveyNatureOption}
                error={errors.sdSurveyNature?.message}
              />
            )}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Eff Start Date <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdStartDate"
            control={control}
            rules={{ required: 'Start date is required' }}
            render={({ field: { onChange, value } }) => (
              <DatePicker
                placeholderText="Select survey start date"
                selected={value}
                onChange={(date) => onChange(date)}
                dateFormat="dd/MM/yyyy"
                className="w-full rounded-md text-sm shadow-sm"
                minDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                error={errors.sdStartDate?.message}
                inputProps={{
                  placeholder: 'Select survey start date',
                }}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Eff End Date <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdDueDate"
            control={control}
            rules={{ required: 'Completion date is required' }}
            render={({ field: { onChange, value } }) => (
              <DatePicker
                placeholderText="Select survey completion date"
                selected={value}
                onChange={(date) => onChange(date)}
                dateFormat="dd/MM/yyyy"
                className="w-full rounded-md text-sm shadow-sm"
                minDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                error={errors.sdDueDate?.message}
                inputProps={{
                  placeholder: 'Select survey completion date',
                }}
              />
            )}
          />
        </div>
      </div>

      {/* Initiated By & Mandatory */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Initiated By <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdInitiatedBy"
            control={control}
            rules={{ required: 'Initiated By is required' }}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  placeholder="Search Initiated By"
                  value={selectedInitiatedBy?.label || initiatedBySearchText}
                  error={!!errors.sdInitiatedBy}
                  onChange={(e) => {
                    setInitiatedBySearchText(e.target.value);
                    setSelectedInitiatedBy(null);
                    field.onChange(null);
                  }}
                />
                {debouncedInitiatedBySearchText &&
                  surveyInitiatedByOption.length > 0 &&
                  !selectedInitiatedBy && (
                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-md">
                      {surveyInitiatedByOption
                        .filter((opt) =>
                          opt.label
                            .toLowerCase()
                            .includes(debouncedInitiatedBySearchText)
                        )
                        .map((opt) => (
                          <li
                            key={opt.value}
                            onClick={() => {
                              setSelectedInitiatedBy(opt);
                              field.onChange(opt.value);
                              setInitiatedBySearchText('');
                            }}
                            className="cursor-pointer px-4 py-2 text-sm hover:bg-blue-100"
                          >
                            {opt.label}
                          </li>
                        ))}
                    </ul>
                  )}
                {errors.sdInitiatedBy && (
                  <p className="text-sm text-red-500">
                    {errors.sdInitiatedBy.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>

        <div className="space-y-2">
          <Text className="text-sm font-medium">
            Mandatory <span className="text-red-500">*</span>
          </Text>
          <Controller
            name="sdSurveyMandYN"
            control={control}
            rules={{ required: 'Mandatory selection is required' }}
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                setValue={field.onChange}
                className="flex gap-6"
                error={!!errors.sdSurveyMandYN}
              >
                <Radio label="Yes" value="Y" />
                <Radio label="No" value="N" />
              </RadioGroup>
            )}
          />
          {errors.sdSurveyMandYN && (
            <p className="text-sm text-red-500">
              {errors.sdSurveyMandYN.message}
            </p>
          )}
        </div>
      </div>

      {/* Purpose & Notes */}
      <div className="space-y-2">
        <Text className="text-sm font-medium">
          Survey Purpose <span className="text-red-500">*</span>
        </Text>
        <Controller
          name="sdDescP"
          control={control}
          rules={{ required: 'Purpose is required' }}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder="Briefly describe the purpose..."
              rows={3}
              error={!!errors.sdDescP}
            />
          )}
        />
        {errors.sdDescP && (
          <p className="text-sm text-red-500">{errors.sdDescP.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Text className="text-sm font-medium">
          Notes <span className="text-red-500">*</span>
        </Text>
        <Controller
          name="sdDesc1P"
          control={control}
          rules={{ required: 'Notes is required' }}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder="Any additional notes..."
              rows={2}
              error={!!errors.sdDesc1P}
            />
          )}
        />
        {errors.sdDesc1P && (
          <p className="text-sm text-red-500">{errors.sdDesc1P.message}</p>
        )}
      </div>

      <div className="mt-6 flex items-center  justify-between gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex gap-3 ">
          <Button type="submit" className="flex items-center gap-2">
            Next <PiArrowRightBold className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};