import { Logger } from 'zeed'
import { trackSilentException } from '../bugs'

const log = Logger('base')

const replacer = (key, value) =>
  (value instanceof Object && !(Array.isArray(value)))
    ? Object.keys(value)
      .sort()
      .filter(key => value[key] != null) 
      .reduce((sorted, key) => {
        // Sorted copy
        sorted[key] = value[key]
        return sorted
      }, {})
    : value


export function JSONSortedStringify(obj: any, indent = 2) {
  return JSON.stringify(obj, replacer, indent)
}

export function objectSnapshot(obj: any) {
  return JSON.stringify(obj, replacer)
}

export function cloneObject(obj) {
  try {
    if (typeof obj === 'object')
      return JSON.parse(JSON.stringify(obj))

    return obj
  }
  catch (err) {
    trackSilentException(err)
    log('cloneObject error:', err)
  }
  return null
}

export function mergeDeep(target: any, source: any) {
  const isObject = obj => obj && typeof obj === 'object'

  if (!isObject(target) || !isObject(source))
    return source

  Object.keys(source).forEach((key) => {
    const targetValue = target[key]
    const sourceValue = source[key]

    if (Array.isArray(targetValue) && Array.isArray(sourceValue))
      target[key] = targetValue.concat(sourceValue)
    else if (isObject(targetValue) && isObject(sourceValue))
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue)
    else
      target[key] = sourceValue
  })

  return target
}

export function isTrue(value: any, dflt = false) {
  if (value == null)
    return dflt
  return ['1', 'true', 'yes'].includes(value.toString().toLocaleLowerCase())
}
