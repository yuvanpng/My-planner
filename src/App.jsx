import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import PasswordLock from './components/Auth/PasswordLock';
import Today from './pages/Today';
import Stats from './pages/Stats';
import Journal from './pages/Journal';
import Goals from './pages/Goals';
import CalendarView from './pages/CalendarView';
import StudyTimer from './pages/StudyTimer';
import IdeaVault from './pages/IdeaVault';
import SkillPlanner from './pages/SkillPlanner';
import RewardsStore from './pages/RewardsStore';

export default function App() {
  return (
    <PasswordLock>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Today />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/study" element={<StudyTimer />} />
            <Route path="/skills" element={<SkillPlanner />} />
            <Route path="/ideas" element={<IdeaVault />} />
            <Route path="/rewards" element={<RewardsStore />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PasswordLock>
  );
}
