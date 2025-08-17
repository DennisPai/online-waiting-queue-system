import jsPDF from 'jspdf';

/**
 * 生成修玄宮問事單 PDF
 * @param {Array} customers - 客戶資料陣列
 * @param {string} filename - 檔案名稱
 */
export const generateFormsPDF = async (customers, filename = '修玄宮問事單') => {
  try {
    // 篩選等待中和處理中的客戶
    const activeCustomers = customers.filter(customer => 
      customer.status === 'waiting' || customer.status === 'processing'
    );

    if (activeCustomers.length === 0) {
      throw new Error('沒有符合條件的客戶資料');
    }

    // 創建 PDF，A4 橫式 (297mm x 210mm)
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // 計算需要的頁數，每頁兩張問事單
    const formsPerPage = 2;
    const totalPages = Math.ceil(activeCustomers.length / formsPerPage);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        pdf.addPage('a4', 'landscape');
      }
      
      // 獲取當前頁要處理的客戶
      const startIndex = pageIndex * formsPerPage;
      const pageCustomers = activeCustomers.slice(startIndex, startIndex + formsPerPage);
      
      // 生成當前頁的問事單
      await generatePageForms(pdf, pageCustomers, pageIndex);
    }
    
    // 下載 PDF
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    pdf.save(`${filename}_${timestamp}.pdf`);
    
    return true;
  } catch (error) {
    console.error('生成PDF時發生錯誤:', error);
    throw new Error(`生成PDF檔案失敗: ${error.message}`);
  }
};

/**
 * 生成單頁的問事單內容
 */
const generatePageForms = async (pdf, customers, pageIndex) => {
  const pageWidth = 297; // A4 橫式寬度
  const pageHeight = 210; // A4 橫式高度
  const formWidth = 148; // A5 直式寬度
  const formHeight = 200; // 問事單高度（留邊距）
  const margin = 5;
  
  for (let i = 0; i < customers.length && i < 2; i++) {
    const customer = customers[i];
    const xOffset = margin + (i * (formWidth + 1)); // 左邊問事單或右邊問事單
    const yOffset = margin;
    
    // 生成單張問事單
    await generateSingleForm(pdf, customer, xOffset, yOffset, formWidth, formHeight);
  }
  
  // 添加中間裁切線
  if (customers.length === 2) {
    const cutLineX = margin + formWidth + 0.5;
    pdf.setLineDash([2, 2]); // 虛線
    pdf.setDrawColor(128, 128, 128); // 灰色
    pdf.line(cutLineX, margin, cutLineX, pageHeight - margin);
    pdf.setLineDash([]); // 重置線條樣式
  }
};

/**
 * 生成單張問事單
 */
const generateSingleForm = async (pdf, customer, x, y, width, height) => {
  // 設定字體 (使用 PDF 內建字體)
  pdf.setFont('helvetica', 'normal');
  pdf.setDrawColor(0, 0, 0); // 黑色邊框
  pdf.setTextColor(0, 0, 0); // 黑色文字
  
  // 外框
  pdf.rect(x, y, width, height);
  
  // 標題區域
  const titleHeight = 15;
  pdf.rect(x, y, width, titleHeight);
  pdf.setFontSize(16);
  pdf.text('修玄宮玄請示單', x + width/2, y + titleHeight/2 + 3, { align: 'center' });
  
  // 主要內容區域分割
  const contentY = y + titleHeight;
  const contentHeight = height - titleHeight;
  
  // 左側請示內容區域
  const leftWidth = width * 0.4;
  const middleWidth = width * 0.25;  
  const rightWidth = width * 0.35;
  
  // 左側區域
  pdf.rect(x, contentY, leftWidth, contentHeight);
  pdf.setFontSize(12);
  pdf.text('請示內容', x + leftWidth/2, contentY + 15, { align: 'center' });
  
  // 填入諮詢主題
  const consultationText = formatConsultationTopics(customer.consultationTopics, customer.otherDetails);
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(consultationText, leftWidth - 10);
  pdf.text(lines, x + 5, contentY + 25);
  
  // 中間區域 (地址和時間)
  pdf.rect(x + leftWidth, contentY, middleWidth, contentHeight);
  
  // 地址區域
  const addressHeight = contentHeight * 0.3;
  pdf.rect(x + leftWidth, contentY, middleWidth, addressHeight);
  pdf.setFontSize(10);
  pdf.text('地址：', x + leftWidth + 2, contentY + 10);
  
  const address = getCustomerAddress(customer);
  const addressLines = pdf.splitTextToSize(address, middleWidth - 4);
  pdf.text(addressLines, x + leftWidth + 2, contentY + 18);
  
  // 時間區域
  const timeY = contentY + addressHeight;
  const timeHeight = contentHeight - addressHeight;
  pdf.rect(x + leftWidth, timeY, middleWidth, timeHeight);
  
  // 年月日時的格子
  const cellHeight = timeHeight / 4;
  const cellWidth = middleWidth / 2;
  
  ['年', '月', '日', '時'].forEach((label, index) => {
    const cellY = timeY + (index * cellHeight);
    pdf.rect(x + leftWidth, cellY, cellWidth, cellHeight);
    pdf.rect(x + leftWidth + cellWidth, cellY, cellWidth, cellHeight);
    pdf.setFontSize(10);
    pdf.text(label, x + leftWidth + cellWidth + cellWidth/2, cellY + cellHeight/2 + 2, { align: 'center' });
  });
  
  // 右側區域 (個人資料)
  pdf.rect(x + leftWidth + middleWidth, contentY, rightWidth, contentHeight);
  
  // 姓名
  const nameHeight = contentHeight * 0.25;
  pdf.rect(x + leftWidth + middleWidth, contentY, rightWidth, nameHeight);
  pdf.setFontSize(12);
  pdf.text('姓名', x + leftWidth + middleWidth + rightWidth/2, contentY + 8, { align: 'center' });
  pdf.setFontSize(14);
  pdf.text(customer.name, x + leftWidth + middleWidth + rightWidth/2, contentY + nameHeight - 5, { align: 'center' });
  
  // 性別
  const genderY = contentY + nameHeight;
  const genderHeight = contentHeight * 0.15;
  pdf.rect(x + leftWidth + middleWidth, genderY, rightWidth, genderHeight);
  pdf.setFontSize(10);
  pdf.text('性別', x + leftWidth + middleWidth + 5, genderY + 8);
  pdf.text(customer.gender === 'male' ? '男' : '女', x + leftWidth + middleWidth + rightWidth - 15, genderY + 8);
  
  // 年齡
  const ageY = genderY + genderHeight;
  const ageHeight = contentHeight * 0.15;
  pdf.rect(x + leftWidth + middleWidth, ageY, rightWidth, ageHeight);
  pdf.text('年齡', x + leftWidth + middleWidth + 5, ageY + 8);
  pdf.text(customer.virtualAge ? `${customer.virtualAge}歲` : '', x + leftWidth + middleWidth + rightWidth - 25, ageY + 8);
  
  // 農曆出生
  const birthY = ageY + ageHeight;
  const birthHeight = contentHeight * 0.25;
  pdf.rect(x + leftWidth + middleWidth, birthY, rightWidth, birthHeight);
  pdf.text('農曆出生', x + leftWidth + middleWidth + rightWidth/2, birthY + 8, { align: 'center' });
  pdf.text('年 月 日 時', x + leftWidth + middleWidth + rightWidth/2, birthY + 16, { align: 'center' });
  
  const lunarDate = formatLunarDate(customer);
  pdf.setFontSize(9);
  pdf.text(lunarDate, x + leftWidth + middleWidth + rightWidth/2, birthY + birthHeight - 8, { align: 'center' });
  
  // 底部電話和編號區域
  const bottomY = contentY + contentHeight * 0.8;
  const bottomHeight = contentHeight * 0.2;
  
  // 電話區域
  pdf.rect(x, bottomY, leftWidth, bottomHeight);
  pdf.setFontSize(10);
  pdf.text('電話：', x + 5, bottomY + 8);
  pdf.text(customer.phone || '', x + 20, bottomY + 8);
  
  // 年月日區域
  pdf.rect(x, bottomY + bottomHeight/2, leftWidth, bottomHeight/2);
  pdf.text('年    月    日', x + leftWidth/2, bottomY + bottomHeight/2 + 8, { align: 'center' });
  
  // 編號區域  
  pdf.rect(x, bottomY + bottomHeight, leftWidth, bottomHeight);
  pdf.text('編號：', x + 5, bottomY + bottomHeight + 8);
  pdf.text(customer.queueNumber.toString(), x + 25, bottomY + bottomHeight + 8);
};

/**
 * 格式化諮詢主題
 */
const formatConsultationTopics = (topics, otherDetails) => {
  if (!topics || topics.length === 0) return '';
  
  const topicMap = {
    'body': '身體',
    'fate': '運途', 
    'karma': '因果',
    'family': '家運/祖先',
    'career': '事業',
    'relationship': '婚姻感情',
    'study': '學業',
    'blessing': '收驚/加持',
    'other': '其他'
  };
  
  const translatedTopics = topics.map(topic => {
    if (topic === 'other' && otherDetails) {
      return `其他(${otherDetails})`;
    }
    return topicMap[topic] || topic;
  });
  
  return translatedTopics.join('、');
};

/**
 * 格式化農曆日期
 */
const formatLunarDate = (customer) => {
  if (!customer.lunarBirthYear || !customer.lunarBirthMonth || !customer.lunarBirthDay) {
    return '';
  }
  
  const minguo = customer.lunarBirthYear - 1911;
  return `民國${minguo}年${customer.lunarBirthMonth}月${customer.lunarBirthDay}日`;
};

/**
 * 獲取客戶地址
 */
const getCustomerAddress = (customer) => {
  if (customer.addresses && customer.addresses.length > 0) {
    return customer.addresses[0].address;
  }
  return '臨時地址';
};

