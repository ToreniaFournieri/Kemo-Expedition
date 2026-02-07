import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { NotificationToast } from './components/NotificationToast';

export default function App() {
  const { state, actions, bags, notifications } = useGameState();

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto">
        <HomeScreen state={state} actions={actions} bags={bags} />
      </div>
      <NotificationToast
        notifications={notifications}
        onDismiss={actions.dismissNotification}
        onDismissAll={actions.dismissAllNotifications}
      />
    </div>
  );
}
