// 表單驗證 schemas
// 目前使用原生 JavaScript 驗證，可在安裝 yup 後升級

/**
 * 驗證器工廠函數
 */
const createValidator = (rules) => {
  return (value, allValues = {}) => {
    for (const rule of rules) {
      const error = rule(value, allValues);
      if (error) return error;
    }
    return null;
  };
};

/**
 * 基本驗證規則
 */
const required = (message = '此欄位為必填') => (value) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return message;
  }
  return null;
};

const minLength = (min, message) => (value) => {
  if (value && value.length < min) {
    return message || `最少需要 ${min} 個字符`;
  }
  return null;
};

const maxLength = (max, message) => (value) => {
  if (value && value.length > max) {
    return message || `最多 ${max} 個字符`;
  }
  return null;
};

const email = (message = '電子郵件格式不正確') => (value) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return message;
  }
  return null;
};

const phone = (message = '電話號碼格式不正確') => (value) => {
  if (value && !/^[0-9+\-\s()]+$/.test(value)) {
    return message;
  }
  return null;
};

const positiveInteger = (message = '必須是正整數') => (value) => {
  if (value && (isNaN(value) || parseInt(value) <= 0)) {
    return message;
  }
  return null;
};

const oneOf = (validValues, message) => (value) => {
  if (value && !validValues.includes(value)) {
    return message || `必須是以下值之一: ${validValues.join(', ')}`;
  }
  return null;
};

/**
 * 註冊表單驗證 schema
 */
export const registrationSchema = {
  name: createValidator([
    required('姓名為必填'),
    minLength(1, '姓名不能為空'),
    maxLength(50, '姓名不能超過 50 個字符')
  ]),
  
  phone: createValidator([
    required('電話號碼為必填'),
    phone('電話號碼格式不正確')
  ]),
  
  email: createValidator([
    email('電子郵件格式不正確')
  ]),
  
  gender: createValidator([
    oneOf(['male', 'female'], '性別必須是男性或女性')
  ]),
  
  gregorianBirthYear: createValidator([
    positiveInteger('出生年必須是正整數')
  ]),
  
  gregorianBirthMonth: createValidator([
    (value) => {
      if (value && (isNaN(value) || value < 1 || value > 12)) {
        return '出生月必須是1-12之間的整數';
      }
      return null;
    }
  ]),
  
  gregorianBirthDay: createValidator([
    (value) => {
      if (value && (isNaN(value) || value < 1 || value > 31)) {
        return '出生日必須是1-31之間的整數';
      }
      return null;
    }
  ]),
  
  consultationTopics: createValidator([
    (value) => {
      const validTopics = ['body', 'fate', 'karma', 'family', 'career', 'relationship', 'study', 'blessing', 'other'];
      if (value && Array.isArray(value)) {
        for (const topic of value) {
          if (!validTopics.includes(topic)) {
            return '包含無效的諮詢主題';
          }
        }
      }
      return null;
    }
  ]),
  
  // 複合驗證：至少要有一組完整的出生日期
  birthDate: createValidator([
    (value, allValues) => {
      const hasGregorian = allValues.gregorianBirthYear && 
                          allValues.gregorianBirthMonth && 
                          allValues.gregorianBirthDay;
      const hasLunar = allValues.lunarBirthYear && 
                      allValues.lunarBirthMonth && 
                      allValues.lunarBirthDay;
      
      if (!hasGregorian && !hasLunar) {
        return '必須提供國曆或農曆出生日期';
      }
      return null;
    }
  ])
};

/**
 * 客戶編輯表單驗證 schema
 */
export const customerEditSchema = {
  ...registrationSchema,
  
  queueNumber: createValidator([
    required('候位號碼為必填'),
    positiveInteger('候位號碼必須是正整數')
  ]),
  
  orderIndex: createValidator([
    positiveInteger('叫號順序必須是正整數')
  ]),
  
  status: createValidator([
    oneOf(['waiting', 'processing', 'completed', 'cancelled'], '狀態值無效')
  ])
};

/**
 * 地址驗證 schema
 */
export const addressSchema = {
  address: createValidator([
    required('地址為必填'),
    maxLength(200, '地址不能超過 200 個字符')
  ]),
  
  addressType: createValidator([
    oneOf(['home', 'work', 'hospital', 'other'], '地址類型無效')
  ])
};

/**
 * 家人資訊驗證 schema
 */
export const familyMemberSchema = {
  name: createValidator([
    required('家人姓名為必填'),
    maxLength(50, '家人姓名不能超過 50 個字符')
  ]),
  
  gender: createValidator([
    oneOf(['male', 'female'], '家人性別必須是男性或女性')
  ]),
  
  relationship: createValidator([
    maxLength(20, '關係說明不能超過 20 個字符')
  ])
};

/**
 * 驗證整個表單
 */
export const validateForm = (data, schema) => {
  const errors = {};
  
  Object.keys(schema).forEach(field => {
    const validator = schema[field];
    const error = validator(data[field], data);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};

/**
 * 驗證單個欄位
 */
export const validateField = (field, value, schema, allValues = {}) => {
  if (schema[field]) {
    return schema[field](value, allValues);
  }
  return null;
};
