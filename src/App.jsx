import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Today from './pages/Today';
import Stats from './pages/Stats';
import Journal from './pages/Journal';
import Academic from './pages/Academic';
import Goals from './pages/Goals';
import CalendarView from './pages/CalendarView';
import StudyTimer from './pages/StudyTimer';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Today />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/academic" element={<Academic />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/study" element={<StudyTimer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
