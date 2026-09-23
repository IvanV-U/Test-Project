document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const statusFilter = document.getElementById('statusFilter');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const projectModal = document.getElementById('projectModal');
  const projectForm = document.getElementById('projectForm');
  const projectTitleInput = document.getElementById('projectTitle');
  const projectDescInput = document.getElementById('projectDescription');
  const projectStatusInput = document.getElementById('projectStatus');
  const projectBudgetInput = document.getElementById('projectBudget');
  const titleError = document.getElementById('titleError');
  const formGlobalError = document.getElementById('formGlobalError');
  const submitProjectBtn = document.getElementById('submitProjectBtn');

  const projectsGrid = document.getElementById('projectsGrid');
  const emptyState = document.getElementById('emptyState');
  const emptyMessage = document.getElementById('emptyMessage');
  const emptyCreateBtn = document.getElementById('emptyCreateBtn');

  const projectCountBadge = document.getElementById('projectCountBadge');
  const filterSummary = document.getElementById('filterSummary');
  const filterSummaryText = document.getElementById('filterSummaryText');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const toast = document.getElementById('toast');

  let searchTimeout = null;

  // --- Formatting Helpers ---
  function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '0 ₽';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'В работе': return 'badge-active';
      case 'Планирование': return 'badge-plan';
      case 'На согласовании': return 'badge-review';
      case 'Завершён': return 'badge-done';
      default: return 'badge-active';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Toast Notifications ---
  let toastTimer = null;
  function showToast(message, isError = false) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'toast';
    if (isError) toast.classList.add('toast-error');
    toast.classList.remove('hidden');

    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  // --- Render Projects ---
  async function loadAndRenderProjects() {
    const query = searchInput.value.trim();
    const status = statusFilter.value;

    try {
      const projects = await ProjectsAPI.getProjects(query, status);
      renderGrid(projects, query, status);
    } catch (err) {
      console.error("Ошибка при загрузке проектов:", err);
      showToast("Не удалось загрузить список проектов", true);
    }
  }

  function renderGrid(projects, query, status) {
    // Обновляем бейдж с количеством
    projectCountBadge.textContent = `Всего: ${projects.length}`;

    // Обновляем сводку фильтров
    const hasFilter = query || (status && status !== 'Все');
    if (hasFilter) {
      const parts = [];
      if (query) parts.push(`поиск: «${query}»`);
      if (status && status !== 'Все') parts.push(`статус: «${status}»`);
      filterSummaryText.textContent = `Фильтры: ${parts.join(', ')}`;
      filterSummary.classList.remove('hidden');
    } else {
      filterSummary.classList.add('hidden');
    }

    // Очищаем сетку
    projectsGrid.innerHTML = '';

    if (projects.length === 0) {
      projectsGrid.classList.add('hidden');
      emptyState.classList.remove('hidden');

      if (hasFilter) {
        emptyMessage.textContent = 'По заданным параметрам поиска ничего не найдено. Попробуйте сбросить фильтры.';
      } else {
        emptyMessage.textContent = 'Список проектов пока пуст. Создайте свой первый проект!';
      }
      return;
    }

    emptyState.classList.add('hidden');
    projectsGrid.classList.remove('hidden');

    // Рендерим карточки
    projects.forEach(project => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.dataset.id = project.id;

      card.innerHTML = `
        <div class="card-top">
          <h3 class="card-title">${escapeHtml(project.title)}</h3>
          <span class="badge badge-status ${getStatusBadgeClass(project.status)}">${escapeHtml(project.status)}</span>
        </div>
        <p class="card-description">${escapeHtml(project.description || 'Описание отсутствует')}</p>
        <div class="card-meta">
          <div class="meta-budget">
            <span class="meta-label">Смета / Бюджет</span>
            <span class="meta-value">${formatCurrency(project.budget)}</span>
          </div>
          <div class="card-actions">
            <span class="meta-date" title="Дата добавления">${escapeHtml(project.created_at || '')}</span>
            <button type="button" class="btn-card-action btn-delete" data-id="${project.id}" title="Удалить проект" aria-label="Удалить проект">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      projectsGrid.appendChild(card);
    });
  }

  // --- Search & Filter Listeners ---
  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    if (val.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadAndRenderProjects();
    }, 200);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    loadAndRenderProjects();
  });

  statusFilter.addEventListener('change', () => {
    loadAndRenderProjects();
  });

  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    statusFilter.value = 'Все';
    loadAndRenderProjects();
  });

  // --- Modal Management ---
  function openModal() {
    projectForm.reset();
    titleError.textContent = '';
    formGlobalError.textContent = '';
    formGlobalError.classList.add('hidden');
    projectModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => projectTitleInput.focus(), 50);
  }

  function closeModal() {
    projectModal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  openModalBtn.addEventListener('click', openModal);
  emptyCreateBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  // Закрытие по клику на фон
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) {
      closeModal();
    }
  });

  // Закрытие по клавише Esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !projectModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // --- Form Validation & Submit ---
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    titleError.textContent = '';
    formGlobalError.textContent = '';
    formGlobalError.classList.add('hidden');

    const title = projectTitleInput.value.trim();
    const description = projectDescInput.value.trim();
    const status = projectStatusInput.value;
    const rawBudget = projectBudgetInput.value.trim();

    if (!title) {
      titleError.textContent = 'Пожалуйста, укажите название проекта';
      projectTitleInput.focus();
      return;
    }

    if (title.length < 3) {
      titleError.textContent = 'Название должно быть не менее 3 символов';
      projectTitleInput.focus();
      return;
    }

    let budget = 0;
    if (rawBudget !== '') {
      budget = parseFloat(rawBudget);
      if (isNaN(budget) || budget < 0) {
        formGlobalError.textContent = 'Бюджет должен быть положительным числом';
        formGlobalError.classList.remove('hidden');
        projectBudgetInput.focus();
        return;
      }
    }

    submitProjectBtn.disabled = true;
    submitProjectBtn.textContent = 'Сохранение...';

    try {
      await ProjectsAPI.createProject({
        title,
        description,
        status,
        budget
      });

      closeModal();
      showToast('Проект успешно создан и сохранён!');
      loadAndRenderProjects();
    } catch (err) {
      formGlobalError.textContent = err.message || 'Ошибка сохранения проекта';
      formGlobalError.classList.remove('hidden');
    } finally {
      submitProjectBtn.disabled = false;
      submitProjectBtn.innerHTML = '<span>Сохранить проект</span>';
    }
  });

  // --- Delete Project ---
  projectsGrid.addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;

    const projectId = parseInt(deleteBtn.dataset.id, 10);
    const card = deleteBtn.closest('.project-card');
    const title = card ? card.querySelector('.card-title').textContent : 'проект';

    if (confirm(`Вы действительно хотите удалить проект «${title}»?`)) {
      try {
        await ProjectsAPI.deleteProject(projectId);
        showToast(`Проект «${title}» удалён`);
        loadAndRenderProjects();
      } catch (err) {
        showToast('Не удалось удалить проект', true);
      }
    }
  });

  // Initial load
  loadAndRenderProjects();
});
