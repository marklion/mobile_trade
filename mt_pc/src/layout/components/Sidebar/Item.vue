<script>
export default {
  name: 'MenuItem',
  functional: true,
  props: {
    icon: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    badge: {
      type: Number,
      default: 0
    }
  },
  render(h, context) {
    const { icon, title, badge } = context.props
    const vnodes = []

    if (icon) {
      if (icon.includes('el-icon')) {
        vnodes.push(<i class={[icon, 'sub-el-icon']} />)
      } else {
        vnodes.push(<svg-icon icon-class={icon}/>)
      }
    }

    if (title) {
      if (badge > 0) {
        const badgeText = badge > 99 ? '99+' : `${badge}`
        vnodes.push(
          <span slot='title' class='menu-title-with-badge'>
            <span>{(title)}</span>
            <span class='menu-badge'>{badgeText}</span>
          </span>
        )
      } else {
        vnodes.push(<span slot='title'>{(title)}</span>)
      }
    }
    return vnodes
  }
}
</script>

<style scoped>
.sub-el-icon {
  color: currentColor;
  width: 1em;
  height: 1em;
}

.menu-title-with-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.menu-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  border-radius: 8px;
  background: #f56c6c;
  color: #fff;
  font-size: 10px;
  line-height: 14px;
  box-sizing: border-box;
}
</style>
