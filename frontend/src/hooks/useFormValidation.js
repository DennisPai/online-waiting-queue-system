import { useState, useCallback } from 'react';
import { validateForm, validateField } from '../utils/validation/schemas';

/**
 * 統一的表單驗證 Hook
 * 提供表單驗證、錯誤狀態管理、即時驗證等功能
 */
export const useFormValidation = (schema, initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // 設置欄位值
  const setValue = useCallback((field, value) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));

    // 如果欄位已被觸碰過，立即驗證
    if (touched[field]) {
      const error = validateField(field, value, schema, { ...values, [field]: value });
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  }, [schema, values, touched]);

  // 設置多個欄位值
  const setValues = useCallback((newValues) => {
    setValues(prev => ({
      ...prev,
      ...newValues
    }));
  }, []);

  // 標記欄位為已觸碰
  const setTouched = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  }, []);

  // 處理欄位失焦
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));

    // 驗證該欄位
    const error = validateField(field, values[field], schema, values);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  }, [values, schema]);

  // 處理欄位變更
  const handleChange = useCallback((field, value) => {
    setValue(field, value);
  }, [setValue]);

  // 驗證整個表單
  const validate = useCallback(() => {
    const formErrors = validateForm(values, schema);
    setErrors(formErrors);
    
    // 標記所有欄位為已觸碰
    const allFields = Object.keys(schema);
    setTouched(
      allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    );

    return Object.keys(formErrors).length === 0;
  }, [values, schema]);

  // 重置表單
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // 檢查表單是否有效
  const isValid = Object.keys(errors).length === 0 && 
                  Object.values(errors).every(error => !error);

  // 檢查是否有任何欄位被觸碰過
  const hasBeenTouched = Object.values(touched).some(Boolean);

  // 獲取欄位的錯誤狀態
  const getFieldError = useCallback((field) => {
    return touched[field] ? errors[field] : null;
  }, [errors, touched]);

  // 檢查欄位是否有錯誤
  const hasFieldError = useCallback((field) => {
    return touched[field] && !!errors[field];
  }, [errors, touched]);

  return {
    // 狀態
    values,
    errors,
    touched,
    isValid,
    hasBeenTouched,

    // 方法
    setValue,
    setValues,
    setTouched,
    handleChange,
    handleBlur,
    validate,
    reset,
    getFieldError,
    hasFieldError
  };
};
