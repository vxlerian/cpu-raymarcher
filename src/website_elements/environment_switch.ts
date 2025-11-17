const buttons = document.querySelectorAll<HTMLButtonElement>('#page-selection button');
const views = document.querySelectorAll<HTMLElement>('.view');

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        if (!targetId) return;

        // Switch visible view
        views.forEach(v => v.classList.remove('active-view'));
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active-view');

        // Update button styling
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

const initialActiveView = document.querySelector<HTMLElement>('.view.active-view');
if (initialActiveView) {
    const initialId = initialActiveView.id;
    buttons.forEach(btn => {
        if (btn.dataset.target === initialId) {
            btn.classList.add('active');
        }
    });
}