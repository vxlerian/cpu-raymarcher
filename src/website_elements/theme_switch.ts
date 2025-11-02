// This file allows for light mode and dark mode to be togged to/from,
// saving state in local storage such that once the website is refreshed, 
// the theme will persist.

const enabledarkMode = () => {
    document.body.classList.add('dark-mode')
    localStorage.setItem('dark-mode', 'active')
}

const disabledarkMode = () => {
    document.body.classList.remove('dark-mode')
    localStorage.setItem('dark-mode', 'inactive')
}

const mainFunc = () => {
    let darkMode = localStorage.getItem('dark-mode')
    if (darkMode === 'active') enabledarkMode()
    const themeSwitch = document.getElementById('theme-switch')
    if (themeSwitch === null) return

    themeSwitch.addEventListener("click", () => {
        darkMode = localStorage.getItem('dark-mode')
        darkMode !== "active" ? enabledarkMode() : disabledarkMode()
    })
}

mainFunc()
