// 這個檔案負責啟動 React 應用程式，並把 App 掛到瀏覽器頁面上。
import {ThemeProvider} from '@sqlrooms/ui';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import './APP.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="dark" storageKey="moi-test-theme">
    <App />
  </ThemeProvider>,
);
