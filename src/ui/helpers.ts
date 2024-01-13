

export function removeElement(el: {
  remove: () => void
  parentNode: { removeChild: (arg0: any) => void }
}) {
  if (typeof el.remove !== 'undefined')
    el.remove()
  else if (typeof el.parentNode !== 'undefined')
    el.parentNode.removeChild(el)
}
