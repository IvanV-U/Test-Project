/**
 * API Service с прозрачным Fallback на LocalStorage.
 * Если Flask-бэкенд доступен — запросы идут через REST API (/api/projects).
 * Если страница открыта автономно или сервер недоступен — данные сохраняются в localStorage.
 */
const ProjectsAPI = (() => {
  const LOCAL_STORAGE_KEY = 'educational_projects_db';

  // Стартовые данные для автономного режима (localStorage)
  const DEFAULT_PROJECTS = [
    {
      id: 1,
      title: "Автоматизация формирования смет",
      description: "Интеграция ИИ для автоматического парсинга спецификаций и расчета сметной стоимости.",
      budget: 450000.0,
      status: "В работе",
      created_at: "23.09.2026"
    },
    {
      id: 2,
      title: "Система классификации проектной документации",
      description: "Нейросетевая модель для распознавания типов проектных документов и извлечения реквизитов.",
      budget: 280000.0,
      status: "Планирование",
      created_at: "22.09.2026"
    },
    {
      id: 3,
      title: "Клиентский портал согласования заказов",
      description: "Личный кабинет заказчика с возможностью отслеживания этапов и выгрузки актов в PDF.",
      budget: 620000.0,
      status: "Завершён",
      created_at: "20.09.2026"
    },
    {
      id: 4,
      title: "Модуль сверки чертежей и спецификаций",
      description: "Компьютерное зрение для проверки соответствия планов этажей проектным ведомостям.",
      budget: 390000.0,
      status: "На согласовании",
      created_at: "18.09.2026"
    }
  ];

  let isLocalStorageMode = window.location.protocol === 'file:';

  function getLocalProjects() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
        return [...DEFAULT_PROJECTS];
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn("Ошибка доступа к localStorage:", e);
      return [...DEFAULT_PROJECTS];
    }
  }

  function saveLocalProjects(projects) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error("Не удалось сохранить в localStorage:", e);
    }
  }

  return {
    async getProjects(query = '', status = '') {
      if (!isLocalStorageMode) {
        try {
          const params = new URLSearchParams();
          if (query) params.append('q', query);
          if (status && status !== 'Все') params.append('status', status);

          const response = await fetch(`/api/projects?${params.toString()}`);
          if (response.ok) {
            return await response.json();
          }
        } catch (err) {
          console.warn("Бэкенд недоступен, переключаемся в режим localStorage:", err);
          isLocalStorageMode = true;
        }
      }

      // LocalStorage Fallback
      let list = getLocalProjects();

      if (query) {
        const q = query.toLowerCase();
        list = list.filter(p => 
          (p.title && p.title.toLowerCase().includes(q)) || 
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      if (status && status !== 'Все') {
        list = list.filter(p => p.status === status);
      }

      return list.sort((a, b) => (b.id || 0) - (a.id || 0));
    },

    async createProject(projectData) {
      if (!isLocalStorageMode) {
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
          });

          if (response.ok) {
            return await response.json();
          } else {
            const errData = await response.json();
            throw new Error(errData.error || 'Ошибка при сохранении проекта на сервере');
          }
        } catch (err) {
          if (err.message && !err.message.includes('fetch')) {
            throw err;
          }
          console.warn("Сервер не ответил, сохраняем в localStorage:", err);
          isLocalStorageMode = true;
        }
      }

      // LocalStorage Fallback
      const list = getLocalProjects();
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

      const newProject = {
        id: Date.now(),
        title: projectData.title.trim(),
        description: (projectData.description || '').trim(),
        budget: Number(projectData.budget) || 0,
        status: projectData.status || 'В работе',
        created_at: formattedDate
      };

      list.unshift(newProject);
      saveLocalProjects(list);
      return newProject;
    },

    async deleteProject(id) {
      if (!isLocalStorageMode) {
        try {
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE'
          });
          if (response.ok) {
            return await response.json();
          }
        } catch (err) {
          console.warn("Ошибка при удалении на сервере, удаляем из localStorage:", err);
          isLocalStorageMode = true;
        }
      }

      // LocalStorage Fallback
      let list = getLocalProjects();
      list = list.filter(p => p.id !== id);
      saveLocalProjects(list);
      return { message: "Удалено локально", id };
    }
  };
})();
