const assetModules = import.meta.glob(['/src/assets/**/*.json'], {
  query: '?url',
  import: 'default',
})

export { assetModules }

export const getAssetsFile = async (path) => {
  const fullPathInSrc = `/src/assets/${path}`
  if (assetModules[fullPathInSrc]) {
    const module = await assetModules[fullPathInSrc]()
    return module
  }
  return undefined
}
