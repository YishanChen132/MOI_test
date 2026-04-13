// 這個檔案是前端畫面的主入口，負責把控制面板和地圖畫面組起來。
import {RoomShell} from '@sqlrooms/room-shell';
import {PlaybackBar} from './map/PlaybackBar';
import {QueryControlPanel} from './map/QueryControlPanel';
import {KeplerMapView} from './map/KeplerMapView';
import {roomStore} from './store';

export function App() {
  return (
    <RoomShell className="h-dvh w-screen overflow-hidden" roomStore={roomStore}>
      <div className="moi-shell">
        <aside className="moi-panel-column">
          <QueryControlPanel />
        </aside>
        <main className="moi-map-column">
          <KeplerMapView />
        </main>
        <footer className="moi-playback-row">
          <PlaybackBar />
        </footer>
      </div>
    </RoomShell>
  );
}
