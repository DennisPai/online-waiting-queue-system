import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatMinguoDate } from './calendarConverter';

// 格式化客戶資料以用於匯出（最詳細版本）
export const formatCustomerDataForExport = (customers) => {
  const exportData = [];
  
  customers.forEach((customer, customerIndex) => {
    // 主客戶基本資料
    const baseCustomerData = {
      '序號': customerIndex + 1,
      '候位號碼': customer.queueNumber,
      '叫號順序': customer.orderIndex || '',
      '狀態': formatStatus(customer.status),
      '姓名': customer.name,
      '性別': customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : '',
      '電話': customer.phone,
      '電子郵件': customer.email || '',
      '國曆出生年': customer.gregorianBirthYear || '',
      '國曆出生月': customer.gregorianBirthMonth || '',
      '國曆出生日': customer.gregorianBirthDay || '',
      '國曆完整日期': customer.gregorianBirthYear && customer.gregorianBirthMonth && customer.gregorianBirthDay 
        ? `民國${customer.gregorianBirthYear - 1911}年${customer.gregorianBirthMonth}月${customer.gregorianBirthDay}日`
        : '',
      '農曆出生年': customer.lunarBirthYear || '',
      '農曆出生月': customer.lunarBirthMonth || '',
      '農曆出生日': customer.lunarBirthDay || '',
      '農曆是否閏月': customer.lunarIsLeapMonth ? '是' : '否',
      '農曆完整日期': customer.lunarBirthYear && customer.lunarBirthMonth && customer.lunarBirthDay 
        ? `民國${customer.lunarBirthYear - 1911}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日${customer.lunarIsLeapMonth ? ' (閏月)' : ''}`
        : '',
      '虛歲': customer.virtualAge ? `${customer.virtualAge} 歲` : '',
      '諮詢主題': Array.isArray(customer.consultationTopics) 
        ? customer.consultationTopics.map(topic => formatConsultationTopic(topic, customer.otherDetails)).join(', ')
        : '',
      '總人數': 1 + (customer.familyMembers ? customer.familyMembers.length : 0),
      '登記時間': customer.createdAt ? new Date(customer.createdAt).toLocaleString('zh-TW') : '',
      '更新時間': customer.updatedAt ? new Date(customer.updatedAt).toLocaleString('zh-TW') : '',
      '完成時間': customer.completedAt ? new Date(customer.completedAt).toLocaleString('zh-TW') : ''
    };

    // 添加地址資訊
    if (customer.addresses && customer.addresses.length > 0) {
      customer.addresses.forEach((address, addrIndex) => {
        baseCustomerData[`地址${addrIndex + 1}`] = address.address || '';
        baseCustomerData[`地址${addrIndex + 1}類型`] = formatAddressType(address.addressType);
      });
      // 填充空的地址欄位（最多3個地址）
      for (let i = customer.addresses.length; i < 3; i++) {
        baseCustomerData[`地址${i + 1}`] = '';
        baseCustomerData[`地址${i + 1}類型`] = '';
      }
    } else {
      // 向後兼容舊格式
      baseCustomerData['地址1'] = customer.address || '';
      baseCustomerData['地址1類型'] = formatAddressType(customer.addressType);
      baseCustomerData['地址2'] = '';
      baseCustomerData['地址2類型'] = '';
      baseCustomerData['地址3'] = '';
      baseCustomerData['地址3類型'] = '';
    }

          // 如果沒有家庭成員，只添加主客戶資料
    if (!customer.familyMembers || customer.familyMembers.length === 0) {
      baseCustomerData['成員類型'] = '主客戶';
      baseCustomerData['家人姓名'] = '';
      baseCustomerData['家人性別'] = '';
      baseCustomerData['家人國曆出生年'] = '';
      baseCustomerData['家人國曆出生月'] = '';
      baseCustomerData['家人國曆出生日'] = '';
      baseCustomerData['家人國曆完整日期'] = '';
      baseCustomerData['家人農曆出生年'] = '';
      baseCustomerData['家人農曆出生月'] = '';
      baseCustomerData['家人農曆出生日'] = '';
      baseCustomerData['家人農曆是否閏月'] = '';
      baseCustomerData['家人農曆完整日期'] = '';
      baseCustomerData['家人虛歲'] = '';
      baseCustomerData['家人地址'] = '';
      baseCustomerData['家人地址類型'] = '';
      exportData.push(baseCustomerData);
    } else {
      // 主客戶資料（標記為主客戶）
      const mainCustomerData = {
        ...baseCustomerData,
        '成員類型': '主客戶',
        '家人姓名': '',
        '家人性別': '',
        '家人國曆出生年': '',
        '家人國曆出生月': '',
        '家人國曆出生日': '',
        '家人國曆完整日期': '',
        '家人農曆出生年': '',
        '家人農曆出生月': '',
        '家人農曆出生日': '',
        '家人農曆是否閏月': '',
        '家人農曆完整日期': '',
        '家人虛歲': '',
        '家人地址': '',
        '家人地址類型': ''
      };
      exportData.push(mainCustomerData);

      // 每個家庭成員單獨一行
      customer.familyMembers.forEach((member, memberIndex) => {
        const memberData = {
          ...baseCustomerData,
          '成員類型': `家庭成員${memberIndex + 1}`,
          '家人姓名': member.name || '',
          '家人性別': member.gender === 'male' ? '男' : '女',
          '家人國曆出生年': member.gregorianBirthYear || '',
          '家人國曆出生月': member.gregorianBirthMonth || '',
          '家人國曆出生日': member.gregorianBirthDay || '',
          '家人國曆完整日期': member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay 
            ? `民國${member.gregorianBirthYear - 1911}年${member.gregorianBirthMonth}月${member.gregorianBirthDay}日`
            : '',
          '家人農曆出生年': member.lunarBirthYear || '',
          '家人農曆出生月': member.lunarBirthMonth || '',
          '家人農曆出生日': member.lunarBirthDay || '',
          '家人農曆是否閏月': member.lunarIsLeapMonth ? '是' : '否',
          '家人農曆完整日期': member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay 
            ? `民國${member.lunarBirthYear - 1911}年${member.lunarBirthMonth}月${member.lunarBirthDay}日${member.lunarIsLeapMonth ? ' (閏月)' : ''}`
            : '',
          '家人虛歲': member.virtualAge ? `${member.virtualAge} 歲` : '',
          '家人地址': member.address || '',
          '家人地址類型': formatAddressType(member.addressType)
        };
        exportData.push(memberData);
      });
    }
  });

  return exportData;
};

// 格式化地址類型
const formatAddressType = (type) => {
  const typeMap = {
    home: '住家',
    work: '工作場所',
    hospital: '醫院',
    other: '其他'
  };
  return typeMap[type] || '';
};

// 格式化諮詢主題
const formatConsultationTopic = (topic, otherDetails = '') => {
  const topicMap = {
    body: '身體',
    fate: '運途',
    karma: '因果',
    family: '家運/祖先',
    career: '事業',
    relationship: '婚姻感情',
    study: '學業',
    blessing: '收驚/加持',
    other: '其他'
  };
  
  const formattedTopic = topicMap[topic] || topic;
  
  // 如果是"其他"且有詳細內容，添加詳細內容
  if (topic === 'other' && otherDetails) {
    return `${formattedTopic}(${otherDetails})`;
  }
  
  return formattedTopic;
};

// 格式化狀態
const formatStatus = (status) => {
  const statusMap = {
    waiting: '等待中',
    processing: '處理中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

// 匯出為Excel格式
export const exportToExcel = (data, filename = '客戶資料') => {
  try {
    // 創建工作簿
    const wb = XLSX.utils.book_new();
    
    // 創建工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 設定欄位寬度（自動調整所有欄位）
    const ws_auto_cols = [];
    const headers = Object.keys(data[0] || {});
    headers.forEach(header => {
      // 根據欄位名稱設定合適的寬度
      let width = 12; // 預設寬度
      if (header.includes('序號')) width = 8;
      else if (header.includes('號碼')) width = 12;
      else if (header.includes('姓名')) width = 15;
      else if (header.includes('電話')) width = 15;
      else if (header.includes('電子郵件')) width = 25;
      else if (header.includes('性別')) width = 8;
      else if (header.includes('地址') && !header.includes('類型')) width = 35;
      else if (header.includes('地址類型') || header.includes('狀態')) width = 12;
      else if (header.includes('日期') || header.includes('時間')) width = 20;
      else if (header.includes('虛歲')) width = 10;
      else if (header.includes('諮詢主題')) width = 25;
      else if (header.includes('成員類型')) width = 12;
      else if (header.includes('閏月')) width = 10;
      ws_auto_cols.push({ wch: width });
    });
    const colWidths = ws_auto_cols;
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '客戶資料');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // 創建Blob並下載
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    saveAs(blob, `${filename}_${timestamp}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('匯出Excel時發生錯誤:', error);
    throw new Error('匯出Excel檔案失敗');
  }
};

// 匯出為CSV格式
export const exportToCSV = (data, filename = '客戶資料') => {
  try {
    // 取得欄位名稱
    const headers = Object.keys(data[0] || {});
    
    // 創建CSV內容
    const csvContent = [
      // 添加BOM以支援中文字符
      '\uFEFF',
      // 標題行
      headers.join(','),
      // 資料行
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // 如果包含逗號、雙引號或換行符，需要用雙引號包圍並轉義
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // 創建Blob並下載
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    saveAs(blob, `${filename}_${timestamp}.csv`);
    
    return true;
  } catch (error) {
    console.error('匯出CSV時發生錯誤:', error);
    throw new Error('匯出CSV檔案失敗');
  }
}; 