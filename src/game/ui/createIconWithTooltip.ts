import { Control } from '@babylonjs/gui/2D/controls/control'
import { Image } from '@babylonjs/gui/2D/controls/image'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle'
import type { TooltipManager } from './createTooltipManager'

type IconWithTooltipOptions = {
  iconHorizontalAlignment?: number
  iconVerticalAlignment?: number
  left: string
  parent: Rectangle
  size: number
  source: string
  tooltip: TooltipManager
  tooltipText: string
  tooltipWidth?: string
  top: string
}

export type IconWithTooltipHandle = {
  hoverArea: Rectangle
  icon: Image
  setSource: (value: string) => void
  setTooltipText: (value: string) => void
}

export function createIconWithTooltip(
  options: IconWithTooltipOptions,
): IconWithTooltipHandle {
  const hoverArea = new Rectangle(`${options.source}-hover-area`)
  hoverArea.width = `${options.size}px`
  hoverArea.height = `${options.size}px`
  hoverArea.thickness = 0
  hoverArea.background = ''
  hoverArea.left = options.left
  hoverArea.top = options.top
  hoverArea.isPointerBlocker = false
  hoverArea.horizontalAlignment = options.iconHorizontalAlignment ?? Control.HORIZONTAL_ALIGNMENT_LEFT
  hoverArea.verticalAlignment = options.iconVerticalAlignment ?? Control.VERTICAL_ALIGNMENT_TOP
  options.parent.addControl(hoverArea)

  const icon = new Image(options.source, options.source)
  icon.width = `${options.size}px`
  icon.height = `${options.size}px`
  icon.isPointerBlocker = false
  icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  hoverArea.addControl(icon)

  let tooltipText = options.tooltipText
  options.tooltip.registerTarget({
    control: hoverArea,
    getText: () => tooltipText,
    width: options.tooltipWidth,
  })

  return {
    hoverArea,
    icon,
    setSource(value: string) {
      icon.name = value
      icon.source = value
    },
    setTooltipText(value: string) {
      tooltipText = value
    },
  }
}
