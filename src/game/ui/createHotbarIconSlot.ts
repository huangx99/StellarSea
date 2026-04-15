import { Control } from '@babylonjs/gui/2D/controls/control'
import { Image } from '@babylonjs/gui/2D/controls/image'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'
import type { TooltipManager } from './createTooltipManager'

export type HotbarIconSlotHandle = {
  badge: TextBlock
  frame: Rectangle
  icon: Image
  setSource: (value: string) => void
  setTooltipText: (value: string) => void
}

type CreateHotbarIconSlotOptions = {
  index: number
  parent: Rectangle
  source: string
  tooltip: TooltipManager
  tooltipText: string
  onPress?: () => void
  enabled?: boolean
}

export function createHotbarIconSlot(options: CreateHotbarIconSlotOptions): HotbarIconSlotHandle {
  const enabled = options.enabled ?? true
  let tooltipText = options.tooltipText

  const frame = new Rectangle(`hotbar-slot-${options.index}`)
  frame.width = '40px'
  frame.height = '40px'
  frame.left = `${(options.index - 4) * 43}px`
  frame.top = '0px'
  frame.thickness = 1
  frame.cornerRadius = 2
  frame.color = '#f8f3df66'
  frame.background = '#2d2d2def'
  frame.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  frame.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  frame.isPointerBlocker = false
  options.parent.addControl(frame)

  const icon = new Image(`hotbar-slot-icon-${options.index}`, options.source)
  icon.width = '22px'
  icon.height = '22px'
  icon.top = '-5px'
  icon.isPointerBlocker = false
  icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  frame.addControl(icon)

  const badge = new TextBlock(`hotbar-slot-badge-${options.index}`)
  badge.width = '100%'
  badge.height = '12px'
  badge.top = '-2px'
  badge.color = '#f8f6e7'
  badge.fontSize = 9
  badge.fontWeight = '700'
  badge.outlineWidth = 2
  badge.outlineColor = '#111111'
  badge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  badge.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  badge.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  badge.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  badge.paddingRight = '5px'
  badge.fontFamily = "'Courier New','Consolas',monospace"
  badge.isPointerBlocker = false
  frame.addControl(badge)

  const hitArea = new Rectangle(`hotbar-slot-hit-${options.index}`)
  hitArea.width = '40px'
  hitArea.height = '40px'
  hitArea.thickness = 0
  hitArea.background = '#ffffff01'
  hitArea.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  hitArea.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  hitArea.isPointerBlocker = enabled
  hitArea.hoverCursor = enabled ? 'pointer' : 'default'
  frame.addControl(hitArea)

  options.tooltip.registerTarget({
    control: hitArea,
    getText: () => tooltipText,
    width: '96px',
  })

  if (enabled && options.onPress !== undefined) {
    hitArea.onPointerDownObservable.add(() => {
      options.onPress?.()
    })
  }

  setHotbarIconSlotState({ badge, frame, icon }, false, enabled)

  return {
    badge,
    frame,
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

export function setHotbarIconSlotState(
  handle: Pick<HotbarIconSlotHandle, 'badge' | 'frame' | 'icon'>,
  active: boolean,
  enabled: boolean,
): void {
  handle.frame.alpha = enabled ? 1 : 0.28
  handle.icon.alpha = enabled ? 1 : 0.24
  handle.badge.alpha = enabled ? 1 : 0.3
  handle.frame.color = active ? '#ffffffff' : '#f8f3df66'
  handle.frame.background = active ? '#5c5c5cef' : '#2d2d2def'
}
