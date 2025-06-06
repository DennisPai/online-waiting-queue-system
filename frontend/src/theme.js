import { createTheme } from '@mui/material/styles';

// 創建自定義主題
const theme = createTheme({
  palette: {
    primary: {
      main: '#ff8800', // 橙色作為主色調
      light: '#ffaa33',
      dark: '#e67700',
      contrastText: '#fff',
    },
    secondary: {
      main: '#3b3b3b', // 深灰色作為輔助色
      light: '#6d6d6d',
      dark: '#1e1e1e',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontWeight: 600,
      fontSize: 'calc(2.125rem * var(--font-size-multiplier, 1))',
    },
    h2: {
      fontWeight: 600,
      fontSize: 'calc(1.875rem * var(--font-size-multiplier, 1))',
    },
    h3: {
      fontWeight: 600,
      fontSize: 'calc(1.5rem * var(--font-size-multiplier, 1))',
    },
    h4: {
      fontWeight: 600,
      fontSize: 'calc(1.25rem * var(--font-size-multiplier, 1))',
    },
    h5: {
      fontWeight: 600,
      fontSize: 'calc(1.125rem * var(--font-size-multiplier, 1))',
    },
    h6: {
      fontWeight: 600,
      fontSize: 'calc(1rem * var(--font-size-multiplier, 1))',
    },
    body1: {
      fontSize: 'calc(1rem * var(--font-size-multiplier, 1))',
    },
    body2: {
      fontSize: 'calc(0.875rem * var(--font-size-multiplier, 1))',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: 'calc(0.875rem * var(--font-size-multiplier, 1))',
    },
    caption: {
      fontSize: 'calc(0.75rem * var(--font-size-multiplier, 1))',
    },
    overline: {
      fontSize: 'calc(0.75rem * var(--font-size-multiplier, 1))',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 30,
          padding: '8px 24px',
          fontSize: 'calc(0.875rem * var(--font-size-multiplier, 1))',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            fontSize: 'calc(1rem * var(--font-size-multiplier, 1))',
          },
          '& .MuiInputLabel-root': {
            fontSize: 'calc(1rem * var(--font-size-multiplier, 1))',
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          fontSize: 'inherit', // 使用從typography定義中繼承的字體大小
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: 'calc(0.875rem * var(--font-size-multiplier, 1))',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: 'calc(0.8125rem * var(--font-size-multiplier, 1))',
        },
      },
    },
  },
});

export default theme; 