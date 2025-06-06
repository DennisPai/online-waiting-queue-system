import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatMinguoDate } from './calendarConverter';

// 格式化客戶資料以用於匯出（使用民國年）
export const formatCustomerDataForExport = (customers) => {
  return customers.map((customer, index) => {
    // 格式化出生日期（使用民國年）
    let birthDateInfo = '';
    if (customer.gregorianBirthYear && customer.gregorianBirthMonth && customer.gregorianBirthDay) {
      const minguoYear = customer.gregorianBirthYear - 1911;
      birthDateInfo = `民國${minguoYear}年${customer.gregorianBirthMonth}月${customer.gregorianBirthDay}日 (國曆)`;
    } else if (customer.lunarBirthYear && customer.lunarBirthMonth && customer.lunarBirthDay) {
      const minguoYear = customer.lunarBirthYear - 1911;
      const leapText = customer.lunarIsLeapMonth ? ' 閏月' : '';
      birthDateInfo = `民國${minguoYear}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日 (農曆${leapText})`;
    }

    // 格式化地址資訊（支援多地址）
    let addressInfo = '';
    if (customer.addresses && customer.addresses.length > 0) {
      addressInfo = customer.addresses.map(addr => 
        `${addr.address} (${formatAddressType(addr.addressType)})`
      ).join('; ');
    } else if (customer.address) {
      // 向後兼容舊格式
      addressInfo = `${customer.address} (${formatAddressType(customer.addressType)})`;
    }

    return {
      '序號': index + 1,
      '候位號碼': customer.queueNumber,
      '姓名': customer.name,
      '電話': customer.phone,
      '電子郵件': customer.email || '',
      '性別': customer.gender === 'male' ? '男' : customer.gender === 'female' ? '女' : '',
      '出生日期': birthDateInfo,
      '虛歲': customer.virtualAge ? `${customer.virtualAge} 歲` : '',
      '地址': addressInfo,
      '家人人數': customer.familyMembers ? customer.familyMembers.length : 0,
      '總人數': 1 + (customer.familyMembers ? customer.familyMembers.length : 0),
      '諮詢主題': Array.isArray(customer.consultationTopics) 
        ? customer.consultationTopics.map(topic => formatConsultationTopic(topic)).join(', ')
        : '',
      '狀態': formatStatus(customer.status),
      '叫號順序': customer.orderIndex || '',
      '登記時間': customer.createdAt ? new Date(customer.createdAt).toLocaleString('zh-TW') : '',
      '更新時間': customer.updatedAt ? new Date(customer.updatedAt).toLocaleString('zh-TW') : '',
      '完成時間': customer.completedAt ? new Date(customer.completedAt).toLocaleString('zh-TW') : ''
    };
  });
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
const formatConsultationTopic = (topic) => {
  const topicMap = {
    body: '身體',
    fortune: '運途',
    karma: '因果',
    family: '家運/祖先',
    career: '事業',
    marriage: '婚姻感情',
    study: '學業',
    blessing: '收驚/加持',
    other: '其他'
  };
  return topicMap[topic] || topic;
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
    
    // 設定欄位寬度
    const colWidths = [
      { wch: 8 },   // 序號
      { wch: 12 },  // 候位號碼
      { wch: 15 },  // 姓名
      { wch: 15 },  // 電話
      { wch: 25 },  // 電子郵件
      { wch: 8 },   // 性別
      { wch: 25 },  // 出生日期
      { wch: 8 },   // 虛歲
      { wch: 35 },  // 地址
      { wch: 10 },  // 家人人數
      { wch: 10 },  // 總人數
      { wch: 25 },  // 諮詢主題
      { wch: 10 },  // 狀態
      { wch: 10 },  // 叫號順序
      { wch: 20 },  // 登記時間
      { wch: 20 },  // 更新時間
      { wch: 20 }   // 完成時間
    ];
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