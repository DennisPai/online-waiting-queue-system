import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 從已 render 的 DOM 元素截圖並輸出 PDF
 * 使用 html2canvas，完全依賴瀏覽器字體渲染，100% 支援中文
 *
 * @param {Array} pageElements - 每頁的 DOM element（297mm×210mm 的 Box）
 * @param {string} filename - 輸出檔名（不含副檔名）
 */
export const generatePDFFromDOMPages = async (pageElements, filename = '修玄宮問事單') => {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('沒有可截圖的頁面元素');
  }

  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const A4_W = 297;
  const A4_H = 210;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    if (!el) continue;

    // html2canvas 截圖（scale=2 = 2x 解析度，更清晰）
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      // 確保截到完整元素
      width: el.offsetWidth,
      height: el.offsetHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    if (i > 0) pdf.addPage('a4', 'landscape');

    // 把截圖貼滿 A4 橫式
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  pdf.save(`${filename}_${timestamp}.pdf`);
  return true;
};

/**
 * 舊版相容：從客戶資料直接生成 PDF（無 DOM 時使用）
 * 此版本在瀏覽器支援中文字體的情況下才能正確顯示中文
 * 推薦使用 generatePDFFromDOMPages 搭配預覽頁面的 DOM
 */
export const generateFormsPDF = async (customers, filename = '修玄宮問事單') => {
  // 若在 PDFPreviewPage 呼叫，優先用 DOM 截圖方式
  // 這個 fallback 函式保留給不在預覽頁的呼叫場景
  const activeCustomers = customers.filter(c =>
    c.status === 'waiting' || c.status === 'processing'
  );
  if (activeCustomers.length === 0) throw new Error('沒有符合條件的客戶資料');

  // 嘗試找到預覽頁面已 render 的 DOM
  const pageBoxes = document.querySelectorAll('[data-pdf-page]');
  if (pageBoxes.length > 0) {
    return generatePDFFromDOMPages(Array.from(pageBoxes), filename);
  }

  // 完全 fallback：動態建立 DOM 元素截圖
  return _generatePDFByDynamicDOM(activeCustomers, filename);
};

/**
 * 動態建立不可見 DOM，render 後截圖
 * 保證中文顯示正確（使用瀏覽器字體）
 */
async function _generatePDFByDynamicDOM(customers, filename) {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const A4_W = 297;
  const A4_H = 210;

  // 每頁兩位客戶
  const formsPerPage = 2;
  const totalPages = Math.ceil(customers.length / formsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageCustomers = customers.slice(pageIdx * formsPerPage, (pageIdx + 1) * formsPerPage);

    // 建立暫時 container（螢幕外）
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 1122px;
      height: 794px;
      background: white;
      display: flex;
      align-items: stretch;
    `;

    pageCustomers.forEach((customer, i) => {
      const formEl = document.createElement('div');
      formEl.style.cssText = `
        width: 560px;
        height: 794px;
        border: 2px solid black;
        box-sizing: border-box;
        padding: 8px;
        font-family: 'Noto Sans TC', '微軟正黑體', 'Microsoft JhengHei', Arial, sans-serif;
        font-size: 12px;
        background: white;
        overflow: hidden;
      `;
      formEl.innerHTML = buildFormHTML(customer);
      container.appendChild(formEl);

      // 裁切線
      if (i < pageCustomers.length - 1) {
        const line = document.createElement('div');
        line.style.cssText = 'width: 2px; background: repeating-linear-gradient(to bottom, #999 0, #999 4px, transparent 4px, transparent 8px); flex-shrink: 0;';
        container.appendChild(line);
      }
    });

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (pageIdx > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, A4_H);
    } finally {
      document.body.removeChild(container);
    }
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  pdf.save(`${filename}_${timestamp}.pdf`);
  return true;
}

/**
 * 為動態 DOM fallback 模式建立 HTML 字串
 */
function buildFormHTML(customer) {
  const consultationTopics = formatConsultationTopics(
    customer.consultationTopics,
    customer.otherDetails
  );
  const address = getCustomerAddress(customer);
  const lunarDate = formatLunarDate(customer);
  const genderText = customer.gender === 'male' ? '男' : '女';

  return `
    <div style="height:100%; display:flex; flex-direction:column; border:2px solid black;">
      <div style="text-align:center; font-size:16px; font-weight:bold; padding:8px; border-bottom:2px solid black;">
        修玄宮玄請示單
      </div>
      <div style="flex:1; display:flex; overflow:hidden;">
        <div style="width:40%; border-right:1px solid black; padding:6px;">
          <div style="font-weight:bold; margin-bottom:6px;">請示內容</div>
          <div style="font-size:11px; line-height:1.6;">${consultationTopics}</div>
        </div>
        <div style="width:25%; border-right:1px solid black; padding:6px;">
          <div style="font-size:11px; margin-bottom:6px;">地址：</div>
          <div style="font-size:10px;">${address}</div>
        </div>
        <div style="width:35%; padding:6px;">
          <div style="text-align:center; font-weight:bold; font-size:12px; margin-bottom:4px;">姓名</div>
          <div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:8px;">${customer.name || ''}</div>
          <div style="font-size:11px;">性別：${genderText}</div>
          <div style="font-size:11px;">年齡：${customer.virtualAge || ''}歲</div>
          <div style="font-size:11px; margin-top:4px;">農曆出生：</div>
          <div style="font-size:11px;">${lunarDate}</div>
          <div style="font-size:11px; margin-top:4px;">電話：${customer.phone || ''}</div>
          <div style="font-size:11px;">編號：${customer.queueNumber || ''}</div>
        </div>
      </div>
    </div>
  `;
}

const formatConsultationTopics = (topics, otherDetails) => {
  if (!topics || topics.length === 0) return '';
  const topicMap = {
    body: '身體', fate: '運途', karma: '因果', family: '家運/祖先',
    career: '事業', relationship: '婚姻感情', study: '學業',
    blessing: '收驚/加持', other: '其他'
  };
  return topics.map(t => t === 'other' && otherDetails ? `其他(${otherDetails})` : (topicMap[t] || t)).join('、');
};

const formatLunarDate = (customer) => {
  if (!customer.lunarBirthYear) return '';
  const minguo = customer.lunarBirthYear - 1911;
  return `民國${minguo}年${customer.lunarBirthMonth || ''}月${customer.lunarBirthDay || ''}日`;
};

const getCustomerAddress = (customer) => {
  if (customer.addresses && customer.addresses.length > 0) {
    const addr = customer.addresses.find(a => a.address && a.address !== '臨時地址');
    return addr ? addr.address : (customer.addresses[0].address || '');
  }
  return '';
};
