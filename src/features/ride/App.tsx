import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SleepOverlay } from './components/SleepOverlay.tsx'
import { PlayerProvider } from './lib/player.tsx'
import { PrefsProvider } from './lib/prefs.tsx'
import { SessionProvider } from './lib/session.tsx'
import { EntertainmentScreen } from './screens/EntertainmentScreen.tsx'
import { GoScreen } from './screens/GoScreen.tsx'
import { JoyrideScreen } from './screens/JoyrideScreen.tsx'
import { MusicScreen } from './screens/MusicScreen.tsx'
import { NewsScreen } from './screens/NewsScreen.tsx'
import { RideScreen } from './screens/RideScreen.tsx'

export function App() {
  return (
    <BrowserRouter>
      <PrefsProvider>
        <SessionProvider>
          <PlayerProvider>
            <div className="h-full bg-feed-black">
              <Routes>
                <Route path="/" element={<Navigate to="/ride" replace />} />
                <Route path="/ride" element={<RideScreen />} />
                <Route path="/ride/news" element={<NewsScreen />} />
                <Route path="/ride/music" element={<MusicScreen />} />
                <Route path="/ride/entertainment" element={<EntertainmentScreen />} />
                <Route path="/ride/joyride" element={<JoyrideScreen />} />
                <Route path="/go/:token" element={<GoScreen />} />
                <Route path="*" element={<Navigate to="/ride" replace />} />
              </Routes>
              <SleepOverlay />
            </div>
          </PlayerProvider>
        </SessionProvider>
      </PrefsProvider>
    </BrowserRouter>
  )
}
