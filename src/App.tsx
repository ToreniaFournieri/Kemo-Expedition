import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { ExpeditionScreen } from './components/ExpeditionScreen';
import { BattleScreen } from './components/BattleScreen';

export default function App() {
  const { state, actions } = useGameState();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto">
        {state.scene === 'home' && (
          <HomeScreen state={state} actions={actions} />
        )}
        {state.scene === 'expedition' && (
          <ExpeditionScreen state={state} actions={actions} />
        )}
        {state.scene === 'battle' && (
          <BattleScreen state={state} actions={actions} />
        )}
      </div>
    </div>
  );
}
