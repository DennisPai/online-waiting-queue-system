/**
 * FormTemplate.jsx
 * 修玄宮問事單 — 橫式 A4 表格（一頁）
 *
 * Props:
 *   groups    — 已分組且已分頁的資料陣列
 *               每個 group = { queueNumber, address, addressType, consultationTopics, otherDetails, rows }
 *               rows[0] = 主記錄，rows[1..] = 家人（{ name, gender, lunarBirthYear, lunarBirthMonth, lunarBirthDay, lunarIsLeapMonth, virtualAge }）
 *   pageIndex — 頁碼（0-based，用於標題顯示）
 */
import React from 'react';
import { Box } from '@mui/material';

const TOPIC_MAP = {
  body: '身體', fate: '運途', karma: '因果', family: '家運/祖先',
  career: '事業', relationship: '婚姻感情', study: '學業',
  blessing: '收驚/加持', other: '其他'
};
const GENDER_MAP = { male: '男', female: '女', other: '其他' };
const ADDR_TYPE_MAP = { home: '住家', work: '工作', hospital: '醫院', other: '其他' };

const formatTopics = (topics, otherDetails) => {
  if (!topics || topics.length === 0) return '';
  return topics.map(t =>
    t === 'other' && otherDetails ? `其他(${otherDetails})` : (TOPIC_MAP[t] || t)
  ).join('、');
};

const formatLunarDate = (row) => {
  if (!row.lunarBirthYear) return '';
  const minguo = row.lunarBirthYear - 1911;
  const leap = row.lunarIsLeapMonth ? '閏' : '';
  return `民國${minguo}年${leap}${row.lunarBirthMonth || ''}月${row.lunarBirthDay || ''}日`;
};

// 表格邊框樣式
const outerBorder = '2px solid black';
const innerBorder = '1px solid black';

// th/td 共用樣式
const cellBase = {
  border: innerBorder,
  textAlign: 'center',
  verticalAlign: 'middle',
  padding: '1mm 2mm',
  fontFamily: "'Noto Sans TC', 'Microsoft JhengHei', '微軟正黑體', sans-serif",
  fontSize: '13px',
  lineHeight: 1.3,
  wordBreak: 'break-word',
  boxSizing: 'border-box',
  height: '15mm',
};

const headerCell = {
  ...cellBase,
  fontWeight: 'bold',
  fontSize: '12px',
  backgroundColor: '#f0f0f0',
  padding: '1.5mm 2mm',
};

const COL_WIDTHS = ['4%', '5%', '7%', '4%', '12%', '5%', '21%', '5%', '7%', '30%'];
const COL_LABELS = ['完成', '序號', '姓名', '性別', '農曆生日', '虛歲', '地址', '類型', '諮詢主題', '備註'];

const FormTemplate = ({ groups = [], pageIndex = 0 }) => {
  return (
    <Box
      sx={{
        width: '297mm',
        height: '210mm',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        padding: '5mm 8mm',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 表格 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: outerBorder,
            tableLayout: 'fixed',
          }}
        >
          <colgroup>
            {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {COL_LABELS.map((label, i) => (
                <th key={i} style={headerCell}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...cellBase, textAlign: 'center', color: '#999' }}>
                  （無資料）
                </td>
              </tr>
            ) : groups.map((group) => {
              const rowSpan = group.rows.length;
              return group.rows.map((row, rowIdx) => (
                <tr key={`${group.queueNumber}-${rowIdx}`}>
                  {/* 合併欄：完成（勾選框） */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{ ...cellBase, border: innerBorder }}>
                      &nbsp;
                    </td>
                  )}

                  {/* 合併欄：序號 */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{
                      ...cellBase,
                      fontWeight: 'bold',
                      fontSize: '22px',
                      border: innerBorder,
                    }}>
                      {group.queueNumber}
                    </td>
                  )}

                  {/* 姓名（每列） */}
                  <td style={{ ...cellBase, border: innerBorder }}>
                    {row.name || ''}
                  </td>

                  {/* 性別（每列） */}
                  <td style={{ ...cellBase, border: innerBorder }}>
                    {GENDER_MAP[row.gender] || ''}
                  </td>

                  {/* 農曆生日（每列） */}
                  <td style={{ ...cellBase, border: innerBorder, fontSize: '12px' }}>
                    {formatLunarDate(row)}
                  </td>

                  {/* 虛歲（每列） */}
                  <td style={{ ...cellBase, border: innerBorder }}>
                    {row.virtualAge ? `${row.virtualAge}歲` : ''}
                  </td>

                  {/* 合併欄：地址 */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{
                      ...cellBase,
                      border: innerBorder,
                      textAlign: 'center',
                      fontSize: '12px',
                    }}>
                      {group.address || ''}
                    </td>
                  )}

                  {/* 合併欄：類型 */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{ ...cellBase, border: innerBorder }}>
                      {ADDR_TYPE_MAP[group.addressType] || group.addressType || ''}
                    </td>
                  )}

                  {/* 合併欄：諮詢主題 */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{
                      ...cellBase,
                      border: innerBorder,
                      fontSize: '12px',
                      textAlign: 'left',
                      verticalAlign: 'top',
                      paddingTop: '2mm',
                    }}>
                      {formatTopics(group.consultationTopics, group.otherDetails)}
                    </td>
                  )}

                  {/* 合併欄：備註（空白手寫區） */}
                  {rowIdx === 0 && (
                    <td rowSpan={rowSpan} style={{
                      ...cellBase,
                      border: innerBorder,
                      textAlign: 'left',
                      verticalAlign: 'top',
                    }}>
                      &nbsp;
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </Box>
    </Box>
  );
};

export default FormTemplate;
