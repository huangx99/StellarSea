import { Scene } from '@babylonjs/core/scene'
import { Control } from '@babylonjs/gui/2D/controls/control'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'

type TooltipTarget = {
  control: Control
  getText: () => string
  width?: string
}

export type TooltipManager = {
  hide: () => void
  registerTarget: (target: TooltipTarget) => void
}

export function createTooltipManager(scene: Scene, overlay: Rectangle): TooltipManager {
  const tooltip = new Rectangle('hud-tooltip')
  tooltip.width = '84px'
  tooltip.height = '28px'
  tooltip.thickness = 1
  tooltip.cornerRadius = 6
  tooltip.color = '#7bdbd866'
  tooltip.background = '#06101be8'
  tooltip.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  tooltip.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  tooltip.isPointerBlocker = false
  tooltip.isVisible = false
  tooltip.alpha = 0
  tooltip.zIndex = 4000
  overlay.addControl(tooltip)

  const label = new TextBlock('hud-tooltip-label')
  label.color = '#f4f1d7'
  label.fontSize = 12
  label.height = '28px'
  label.outlineWidth = 1
  label.outlineColor = '#040711ee'
  label.textWrapping = false
  label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  label.fontFamily = "'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif"
  tooltip.addControl(label)

  const targets: TooltipTarget[] = []

  const hide = () => {
    tooltip.isVisible = false
    tooltip.alpha = 0
  }

  const isTargetVisible = (control: Control): boolean => {
    let current: Control | null | undefined = control
    while (current) {
      if (!current.isVisible) {
        return false
      }

      current = current.parent
    }

    return true
  }

  const show = (target: TooltipTarget) => {
    const text = target.getText().trim()
    if (!text) {
      hide()
      return
    }

    label.text = text
    tooltip.width = target.width ?? '72px'
    tooltip.isVisible = true
    tooltip.alpha = 1

    const overlayWidth = Math.max(overlay.widthInPixels, 1)
    const tooltipWidth = Math.max(Number.parseInt(target.width ?? '84', 10) || 84, 84)
    const tooltipHeight = Math.max(tooltip.heightInPixels, 28)
    const halfWidth = target.control.widthInPixels * 0.5
    const showLeft = target.control.centerX > overlayWidth - tooltipWidth - 18
    const x = showLeft
      ? target.control.centerX - halfWidth - tooltipWidth - 10
      : target.control.centerX + halfWidth + 10
    const y = target.control.centerY - tooltipHeight * 0.5

    tooltip.leftInPixels = Math.round(x)
    tooltip.topInPixels = Math.round(y)
  }

  scene.onBeforeRenderObservable.add(() => {
    const pointerX = scene.pointerX
    const pointerY = scene.pointerY

    for (let index = targets.length - 1; index >= 0; index -= 1) {
      const target = targets[index]
      if (!target.control.isEnabled || !isTargetVisible(target.control)) {
        continue
      }

      if (!target.control.contains(pointerX, pointerY)) {
        continue
      }

      show(target)
      return
    }

    hide()
  })

  return {
    hide,
    registerTarget(target: TooltipTarget) {
      targets.push(target)
    },
  }
}
