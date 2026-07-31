
export function setTabBarSelected() {
    try {
        uni.hideTabBar({ animation: false });
    } catch (e) {
        // ignore
    }
}
