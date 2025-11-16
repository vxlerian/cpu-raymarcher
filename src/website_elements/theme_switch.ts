// This file allows for light mode and dark mode to be togged to/from,
// saving state in local storage such that once the website is refreshed, 
// the theme will persist.

const enabledarkMode = () => {
    document.body.classList.add('dark-mode')
    sessionStorage.setItem('dark-mode', 'active')
    
    const isDark = true;
    window.dispatchEvent(
        new CustomEvent('theme-change', { detail: isDark })
    )
}

const disabledarkMode = () => {
    document.body.classList.remove('dark-mode')
    sessionStorage.setItem('dark-mode', 'inactive')

    const isDark = false;
    window.dispatchEvent(
        new CustomEvent('theme-change', { detail: isDark })
    )
}

const mainFunc = () => {
    let darkMode = sessionStorage.getItem('dark-mode')
    // Persistant
    if (darkMode === 'active') enabledarkMode()
    const themeSwitch = document.getElementById('theme-switch')
    if (themeSwitch === null) return

    themeSwitch.addEventListener("click", () => {
        darkMode = sessionStorage.getItem('dark-mode')
        darkMode !== "active" ? enabledarkMode() : disabledarkMode()
    })
}

mainFunc()