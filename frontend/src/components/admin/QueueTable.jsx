import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Alert
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon
} from '@mui/icons-material';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { formatMinguoDate } from '../../utils/calendarConverter';

const QueueTable = ({
  queueList,
  visibleColumns,
  availableColumns,
  currentTab,
  duplicateNumbers,
  onOpenDetails,
  onCompletionChange,
  onCancelCustomer,
  onRestoreCustomer,
  renderColumnContent
}) => {
  const getStatusChip = (status, orderIndex) => {
    if (status === 'completed') {
      return <Chip label="已完成" color="success" size="small" />;
    } else if (status === 'cancelled') {
      return <Chip label="已取消" color="error" size="small" />;
    } else if (orderIndex === 1) {
      return <Chip label="處理中" color="warning" size="small" />;
    } else {
      return <Chip label="等待中" color="info" size="small" />;
    }
  };

  const formatConsultationTopics = (topics, otherDetails = '') => {
    if (!topics || topics.length === 0) return '無';
    
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
    
    const formattedTopics = topics.map(topic => topicMap[topic] || topic);
    
    // 如果包含"其他"且有詳細內容，顯示詳細內容
    if (topics.includes('other') && otherDetails) {
      const otherIndex = formattedTopics.indexOf('其他');
      if (otherIndex !== -1) {
        formattedTopics[otherIndex] = `其他(${otherDetails})`;
      }
    }
    
    return formattedTopics.join(', ');
  };

  const formatAddressType = (type) => {
    const typeMap = {
      'home': '住家',
      'work': '工作場所',
      'hospital': '醫院',
      'other': '其他'
    };
    return typeMap[type] || type;
  };

  const formatAddresses = (addresses) => {
    if (!addresses || addresses.length === 0) return '無';
    
    return addresses.map(addr => 
      `${addr.address} (${formatAddressType(addr.addressType)})`
    ).join('; ');
  };

  const formatFamilyMembers = (familyMembers) => {
    if (!familyMembers || familyMembers.length === 0) return '無';
    
    return familyMembers.map((member, index) => {
      const birthInfos = [];
      
      // 國曆出生日期
      if (member.gregorianBirthYear && member.gregorianBirthMonth && member.gregorianBirthDay) {
        const gregorianDate = formatMinguoDate(
          member.gregorianBirthYear,
          member.gregorianBirthMonth,
          member.gregorianBirthDay
        );
        birthInfos.push(`國曆：${gregorianDate}`);
      }
      
      // 農曆出生日期
      if (member.lunarBirthYear && member.lunarBirthMonth && member.lunarBirthDay) {
        const lunarDate = formatMinguoDate(
          member.lunarBirthYear,
          member.lunarBirthMonth,
          member.lunarBirthDay
        );
        const leapText = member.lunarIsLeapMonth ? '閏' : '';
        birthInfos.push(`農曆：${lunarDate}${leapText ? ` (${leapText}月)` : ''}`);
      }
      
      const birthInfo = birthInfos.length > 0 ? birthInfos.join(' / ') : '出生日期未設定';
      
      // 添加虛歲顯示
      const ageInfo = member.virtualAge ? ` (虛歲${member.virtualAge}歲)` : '';
      
      // 添加性別顯示
      const genderText = member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : '';
      const genderInfo = genderText ? ` (${genderText})` : '';
      
      return `${member.name}${genderInfo}${ageInfo} - ${birthInfo} - ${member.address || '未填寫地址'} (${formatAddressType(member.addressType)})`;
    }).join('; ');
  };

  const getTotalPeopleCount = (familyMembers) => {
    return 1 + (familyMembers ? familyMembers.length : 0);
  };

  const formatGender = (gender) => {
    switch (gender) {
      case 'male':
        return '男';
      case 'female':
        return '女';
      default:
        return gender || '';
    }
  };

  const formatBirthDateColumn = (row) => {
    // 顯示國曆或農曆出生日期（使用民國年）
    if (row.gregorianBirthYear && row.gregorianBirthMonth && row.gregorianBirthDay) {
      return `國曆：${formatMinguoDate(row.gregorianBirthYear, row.gregorianBirthMonth, row.gregorianBirthDay)}`;
    } else if (row.lunarBirthYear && row.lunarBirthMonth && row.lunarBirthDay) {
      const leapText = row.lunarIsLeapMonth ? '閏' : '';
      return `農曆：${formatMinguoDate(row.lunarBirthYear, row.lunarBirthMonth, row.lunarBirthDay)}${leapText ? ` (${leapText}月)` : ''}`;
    }
    return '未設定';
  };

  const defaultRenderColumnContent = (column, row, index) => {
    switch (column) {
      case 'orderIndex':
        return row.orderIndex || '';
      case 'queueNumber':
        return row.queueNumber || '';
      case 'status':
        return getStatusChip(row.status, row.orderIndex);
      case 'name':
        return row.name || '';
      case 'phone':
        return row.phone || '';
      case 'email':
        return row.email || '未提供';
      case 'gender':
        return formatGender(row.gender);
      case 'birthDate':
        return formatBirthDateColumn(row);
      case 'virtualAge':
        return row.virtualAge ? `${row.virtualAge}歲` : '未計算';
      case 'addresses':
        return formatAddresses(row.addresses);
      case 'familyMembers':
        return formatFamilyMembers(row.familyMembers);
      case 'totalPeople':
        return getTotalPeopleCount(row.familyMembers);
      case 'consultationTopics':
        return formatConsultationTopics(row.consultationTopics, row.otherDetails);
      case 'remarks':
        return row.remarks || '無';
      case 'createdAt':
        return row.createdAt ? new Date(row.createdAt).toLocaleString('zh-TW') : '';
      case 'updatedAt':
        return row.updatedAt ? new Date(row.updatedAt).toLocaleString('zh-TW') : '';
      case 'completedAt':
        return row.completedAt ? new Date(row.completedAt).toLocaleString('zh-TW') : '';
      default:
        return '';
    }
  };

  // 使用傳入的 renderColumnContent 或預設的
  const getColumnContent = renderColumnContent || defaultRenderColumnContent;

  // 重複號碼警告
  const duplicateWarning = duplicateNumbers.length > 0 && (
    <Alert severity="warning" sx={{ mb: 2 }}>
      檢測到重複的客戶號碼：{duplicateNumbers.join(', ')}，請檢查並修正。
    </Alert>
  );

  return (
    <>
      {duplicateWarning}
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {currentTab === 0 && (
                <TableCell style={{ width: 50 }}></TableCell>
              )}
              {visibleColumns.map((column) => {
                // 定義各欄位的樣式配置
                const getColumnStyle = (columnKey) => {
                  const baseStyle = { fontWeight: 'bold' };
                  
                  switch (columnKey) {
                    case 'actions':
                      return {
                        ...baseStyle,
                        width: 160, // 減少操作欄位寬度
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'white',
                        zIndex: 1
                      };
                    case 'orderIndex':
                      return {
                        ...baseStyle,
                        width: 90, // 加寬叫號順序欄位
                        fontSize: '0.85rem' // 縮小字體
                      };
                    case 'queueNumber':
                      return {
                        ...baseStyle,
                        width: 80, // 加寬號碼欄位
                        fontSize: '0.85rem' // 縮小字體
                      };
                    case 'totalPeople':
                      return {
                        ...baseStyle,
                        width: 80, // 加寬人數欄位
                        fontSize: '0.85rem' // 縮小字體
                      };
                    case 'status':
                      return {
                        ...baseStyle,
                        width: 100 // 狀態欄位寬度
                      };
                    case 'name':
                      return {
                        ...baseStyle,
                        width: 100 // 姓名欄位與狀態一樣寬
                      };
                    default:
                      return baseStyle;
                  }
                };

                return (
                  <TableCell
                    key={column}
                    style={getColumnStyle(column)}
                  >
                    {availableColumns[column]?.label || column}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <Droppable droppableId="queue-table" isDropDisabled={currentTab !== 0}>
            {(provided) => (
              <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                {queueList.map((row, index) => {
                  const isDuplicate = duplicateNumbers.includes(row.queueNumber);
                  
                  return (
                    <Draggable
                      key={row._id}
                      draggableId={row._id}
                      index={index}
                      isDragDisabled={currentTab !== 0}
                    >
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                            backgroundColor: isDuplicate 
                              ? 'rgba(255, 0, 0, 0.1)' 
                              : snapshot.isDragging 
                                ? '#f5f5f5' 
                                : 'transparent'
                          }}
                        >
                          {currentTab === 0 && (
                            <TableCell
                              {...provided.dragHandleProps}
                              style={{ cursor: 'grab', textAlign: 'center' }}
                            >
                              <DragIndicatorIcon color="action" />
                            </TableCell>
                          )}
                          
                          {visibleColumns.map((column) => {
                            if (column === 'actions') {
                              return (
                                <TableCell
                                  key={column}
                                  style={{
                                    position: 'sticky',
                                    right: 0,
                                    backgroundColor: 'white',
                                    zIndex: 1,
                                    width: 160,
                                    minWidth: 160
                                  }}
                                >
                                  {currentTab === 0 ? (
                                    <>
                                      <Checkbox
                                        checked={row.status === 'completed'}
                                        onChange={(event) => onCompletionChange(event, row._id, event.target.checked)}
                                        color="success"
                                        size="small"
                                        sx={{ mr: 1 }}
                                      />
                                      <Tooltip title="查看詳細資料">
                                        <IconButton
                                          size="small"
                                          onClick={() => onOpenDetails(row)}
                                          sx={{ mr: 1 }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="取消預約">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => onCancelCustomer(row._id, row.name)}
                                          sx={{ mr: 1 }}
                                        >
                                          <CancelIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      <Tooltip title="查看詳細資料">
                                        <IconButton
                                          size="small"
                                          onClick={() => onOpenDetails(row)}
                                          sx={{ mr: 1 }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="復原客戶">
                                        <IconButton
                                          size="small"
                                          color="success"
                                          onClick={() => onRestoreCustomer(row._id, row.name)}
                                        >
                                          <RestoreIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </TableCell>
                              );
                            }
                            
                            return (
                              <TableCell key={column}>
                                {getColumnContent(column, row, index)}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                
                {queueList.length === 0 && (
                  <TableRow>
                    <TableCell 
                      colSpan={visibleColumns.length + (currentTab === 0 ? 1 : 0)} 
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {currentTab === 0 ? '目前沒有候位客戶' : '沒有已取消的客戶'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </TableContainer>
    </>
  );
};

export default QueueTable;
