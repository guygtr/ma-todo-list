import { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Sun, Moon } from 'lucide-react';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

type Priority = 'high' | 'medium' | 'low';

interface Task {
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // NOUVEAU : Drapeau pour savoir si Firebase a fini de charger
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);

  // ASTUCE PRO : Initialiser avec le LocalStorage pour éviter le flash blanc
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Gérer l'ajout ou la suppression de la classe 'dark' instantanément
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // On sauvegarde aussi localement pour le prochain rafraîchissement
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Auth anonyme
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return unsubscribe;
  }, []);

  // Charger tâches + darkMode depuis Firebase
  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const unsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTasks(data.tasks || []);

        // Mettre à jour le darkMode s'il existe dans Firebase
        if (data.preferences?.darkMode !== undefined) {
          setDarkMode(data.preferences.darkMode);
        }
      } else {
        setTasks([]);
      }
      setLoading(false);
      // On signale que le premier chargement est fait, la sauvegarde est désormais autorisée !
      setIsInitialLoadDone(true); 
    }, console.error);

    return unsubscribe;
  }, [userId]);

  // Sauvegarde des tâches
  useEffect(() => {
    // On évite de vider la base de données si le chargement n'est pas fini
    if (!userId || !isInitialLoadDone) return;
    setDoc(doc(db, "users", userId), { tasks }, { merge: true }).catch(console.error);
  }, [tasks, userId, isInitialLoadDone]);

  // Sauvegarde des préférences (darkMode) dans Firebase
  useEffect(() => {
    // Crucial : On ne sauvegarde dans Firebase QUE si le chargement initial est terminé
    if (!userId || !isInitialLoadDone) return;

    setDoc(
      doc(db, "users", userId),
      { preferences: { darkMode } },
      { merge: true }
    ).catch(console.error);
  }, [darkMode, userId, isInitialLoadDone]);

  const addTask = () => {
    if (newTask.trim() === '') return;
    setTasks([
      ...tasks,
      { text: newTask.trim(), completed: false, priority, createdAt: Date.now() },
    ]);
    setNewTask('');
    setPriority('medium');
  };

  const deleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const toggleComplete = (index: number) => {
    setTasks(
      tasks.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const clearAllTasks = () => {
    if (window.confirm('Es-tu sûr de vouloir tout effacer ?')) {
      setTasks([]);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const prioOrder = { high: 3, medium: 2, low: 1 };
    const prioDiff = prioOrder[b.priority] - prioOrder[a.priority];
    return prioDiff !== 0 ? prioDiff : b.createdAt - a.createdAt;
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const remainingTasks = totalTasks - completedTasks;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        
        {/* En-tête */}
        <div className={`p-6 text-center relative ${darkMode ? 'bg-blue-800' : 'bg-blue-600'} text-white`}>
          <h1 className="text-3xl font-bold">Ma Liste de Tâches v3</h1>
          <p className="mt-2 text-lg opacity-90">
            {remainingTasks} restante{remainingTasks !== 1 ? 's' : ''} / {totalTasks} totale{totalTasks !== 1 ? 's' : ''}
          </p>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all"
            aria-label="Changer de thème"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 opacity-70">
            <p className="text-lg font-medium">Chargement des tâches...</p>
            <p className="text-4xl mt-4 animate-bounce">⏳</p>
          </div>
        ) : (
          <>
            {/* Formulaire d'ajout */}
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-6">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  placeholder="Nouvelle tâche..."
                  className={`flex-1 min-w-[150px] px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-400 placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 placeholder-gray-500'
                  }`}
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={`px-2 py-3 border rounded-lg focus:outline-none focus:ring-2 transition cursor-pointer ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-400'
                      : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500'
                  }`}
                >
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
                <button
                  onClick={addTask}
                  className="flex-1 sm:flex-none bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-semibold shadow-md hover:shadow-lg justify-center active:scale-95"
                >
                  <PlusCircle size={20} />
                  <span>Ajouter</span>
                </button>
              </div>

              {/* Liste des tâches */}
              {sortedTasks.length === 0 ? (
                <div className="text-center py-8 opacity-70">
                  <p className="italic">Aucune tâche pour le moment…</p>
                  <p className="text-3xl mt-3">😊</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {sortedTasks.map((task) => {
                    const originalIndex = tasks.findIndex(t => t.createdAt === task.createdAt);
                    const colorMap = {
                      high: darkMode ? 'bg-red-900/20 border-red-800 text-red-100' : 'bg-red-50 border-red-200 text-red-900',
                      medium: darkMode ? 'bg-yellow-900/20 border-yellow-800 text-yellow-100' : 'bg-yellow-50 border-yellow-200 text-yellow-900',
                      low: darkMode ? 'bg-green-900/20 border-green-800 text-green-100' : 'bg-green-50 border-green-200 text-green-900',
                    }[task.priority];

                    return (
                      <li
                        key={task.createdAt}
                        className={`flex items-center justify-between px-4 py-4 rounded-xl border transition-all hover:shadow-sm ${
                          task.completed ? 'opacity-50 bg-gray-100 dark:bg-gray-700 border-transparent' : colorMap
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleComplete(originalIndex)}
                            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`flex-1 break-words ${task.completed ? 'line-through' : ''}`}>
                            {task.text}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTask(originalIndex)}
                          className="ml-2 text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                          aria-label="Supprimer la tâche"
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pied de page */}
            <div className={`p-4 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm border-t transition-colors ${
              darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
            }`}>
              <span>
                {completedTasks} terminée{completedTasks !== 1 ? 's' : ''} • {remainingTasks} restante{remainingTasks !== 1 ? 's' : ''}
              </span>
              {totalTasks > 0 && (
                <button
                  onClick={clearAllTasks}
                  className="text-red-500 hover:text-red-700 font-medium transition-colors p-1"
                >
                  Tout effacer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;