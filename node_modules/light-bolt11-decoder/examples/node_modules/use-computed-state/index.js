import {useState, useEffect} from 'react'

export default function useComputedState(comp, deps) {
  let [result, setResult] = useState()

  useEffect(() => {
    Promise.resolve().then(async () => {
      setResult(await comp())
    })
  }, deps)

  return result
}
