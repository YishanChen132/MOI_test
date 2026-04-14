// 這個檔案是前端畫面的主入口，負責把控制面板和地圖畫面組起來。
import {RoomShell} from '@sqlrooms/room-shell';
import {Timebar} from './components/controllor/Timebar';
import {ControlMenu} from './components/controllor/ControlMenu';
import {MapLayers} from './components/mapLayers/MapLayers';
import {roomStore} from './app/store';

export function App() {
  return (
    <RoomShell className="h-dvh w-screen overflow-hidden" roomStore={roomStore}>
      <div className="moi-shell">
        <aside className="moi-panel-column">
          <ControlMenu />
        </aside>
        <main className="moi-map-column">
          <MapLayers />
        </main>
        <footer className="moi-playback-row">
          <Timebar />
        </footer>
      </div>
    </RoomShell>
  );
}
