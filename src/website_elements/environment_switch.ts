const buttons = document.querySelectorAll<HTMLButtonElement>('#page-selection button');
const views = document.querySelectorAll<HTMLElement>('.view');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;

        views.forEach(v => v.classList.remove('active-view'));

        const target = document.getElementById(targetId);
        if (target) target.classList.add('active-view');
    });
});