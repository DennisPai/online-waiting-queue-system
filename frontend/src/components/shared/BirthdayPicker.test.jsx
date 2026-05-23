/**
 * BirthdayPicker.test.jsx
 *
 * Change C / Task 4.1.1：lunarOnly 模式 4 個 test case
 *
 * 驗證範圍：
 *   1. default lunarOnly=true 時不顯示國曆/農曆切換按鈕組
 *   2. lunarOnly=true 時 calendarType 強制 lunar、即使外部傳 'gregorian' 也被覆蓋
 *      （透過 onChange 回呼確認永遠帶 calendarType: 'lunar'）
 *   3. lunarOnly=true 時閏月勾選框仍會顯示（必要時，例如 2020 閏 4 月）
 *   4. 顯式傳 lunarOnly={false} 時行為 100% 不變
 *      （國曆/農曆切換按鈕仍顯示、預設 calendarType='gregorian' 不被強制）
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BirthdayPicker from './BirthdayPicker';

describe('Change C / Task 4.1.1 — BirthdayPicker lunarOnly 模式', () => {
  test('default lunarOnly=true 時不顯示國曆/農曆切換按鈕組', () => {
    render(<BirthdayPicker onChange={() => {}} />);

    // ToggleButtonGroup 內的「國曆」「農曆」按鈕應不存在
    expect(screen.queryByRole('button', { name: '國曆' })).toBeNull();
    expect(screen.queryByRole('button', { name: '農曆' })).toBeNull();
  });

  test('lunarOnly=true 時 calendarType 強制 lunar、即使外部傳 gregorian 也被覆蓋', () => {
    const handleChange = jest.fn();

    // 故意傳 calendarType='gregorian' 試圖污染；同時給 year/month 讓 leap checkbox 可互動
    // 2020 年農曆 4 月有閏月 → leapMonthAvailable=true → checkbox enabled
    render(
      <BirthdayPicker
        calendarType="gregorian"
        year={2020}
        month={4}
        onChange={handleChange}
      />
    );

    // 觸發 onChange：點閏月 checkbox（lunarOnly=true 時恆顯示，且 2020/4 有閏月所以 enabled）
    const leapCheckbox = screen.getByRole('checkbox');
    expect(leapCheckbox).not.toBeDisabled();
    fireEvent.click(leapCheckbox);

    expect(handleChange).toHaveBeenCalled();
    // 任何一次 call 的 payload 都應帶 calendarType: 'lunar'（即使外部傳 gregorian）
    handleChange.mock.calls.forEach(([payload]) => {
      expect(payload.calendarType).toBe('lunar');
    });
  });

  test('lunarOnly=true 時閏月勾選框仍會顯示', () => {
    // 因為內部 effectiveCalendarType 強制 'lunar'，閏月區塊條件 effectiveCalendarType === 'lunar' 必為 true
    render(
      <BirthdayPicker
        year={2020}
        month={4}
        onChange={() => {}}
      />
    );

    // 閏月 label 應該存在（不論 enabled / disabled）
    expect(screen.getByText('閏月')).toBeInTheDocument();
    // 對應 checkbox 也應存在（MUI Checkbox 為 role=checkbox）
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  test('顯式傳 lunarOnly={false} 時行為 100% 不變（國曆/農曆切換按鈕仍顯示、預設 calendarType=gregorian 不被強制）', () => {
    const handleChange = jest.fn();

    render(
      <BirthdayPicker
        lunarOnly={false}
        calendarType="gregorian"
        onChange={handleChange}
      />
    );

    // 切換按鈕應該顯示
    expect(screen.getByRole('button', { name: '國曆' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '農曆' })).toBeInTheDocument();

    // 點切換按鈕到「農曆」 → onChange 應該帶 calendarType: 'lunar'
    fireEvent.click(screen.getByRole('button', { name: '農曆' }));
    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls[handleChange.mock.calls.length - 1][0];
    expect(lastCall.calendarType).toBe('lunar');

    // 換新的 render：calendarType='gregorian' 時不應被強制成 lunar
    // 驗證方式：onChange 沒被觸發前，內部 effective 應為 gregorian
    // 等價驗證：閏月 checkbox 在 calendarType='gregorian' 時不應顯示
    handleChange.mockClear();
    render(
      <BirthdayPicker
        lunarOnly={false}
        calendarType="gregorian"
        year={2020}
        month={4}
        onChange={handleChange}
      />
    );
    // 這個第二份 render 因 calendarType='gregorian' 且 lunarOnly=false，閏月 checkbox 不應該存在
    // 取第二份 render（在第一份基礎上 append），用 queryAllByText 計數驗證
    const leapTexts = screen.queryAllByText('閏月');
    // 第一份 render 也是 lunarOnly=false + calendarType=gregorian，所以閏月也不會出現
    expect(leapTexts.length).toBe(0);
  });
});
