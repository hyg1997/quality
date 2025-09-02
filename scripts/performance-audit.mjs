#!/usr/bin/env node

/**
 * Performance Audit Script
 * Analiza el bundle y proporciona recomendaciones de optimización
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'


class PerformanceAuditor {
  constructor() {
    this.results = {
      bundleSize: {},
      recommendations: [],
      warnings: [],
      errors: []
    }
  }

  async runAudit() {
    console.log('🔍 Iniciando auditoría de performance...')
    
    try {
      await this.analyzeBundleSize()
      await this.checkDependencies()
      await this.analyzeComponents()
      await this.checkImages()
      
      this.generateReport()
    } catch (error) {
      console.error('❌ Error durante la auditoría:', error.message)
      process.exit(1)
    }
  }

  async analyzeBundleSize() {
    console.log('📦 Analizando tamaño del bundle...')
    
    try {
      // Verificar si existe el build
      const buildPath = path.join(process.cwd(), '.next')
      if (!fs.existsSync(buildPath)) {
        console.log('🔨 Construyendo aplicación...')
        execSync('npm run build', { stdio: 'inherit' })
      }
      
      // Analizar archivos estáticos
      const staticPath = path.join(buildPath, 'static')
      if (fs.existsSync(staticPath)) {
        const stats = this.getDirectorySize(staticPath)
        this.results.bundleSize.static = stats
        
        if (stats.totalSize > 5 * 1024 * 1024) { // 5MB
          this.results.warnings.push({
            type: 'bundle-size',
            message: `Bundle estático es grande (${this.formatBytes(stats.totalSize)}). Considera code splitting.`,
            recommendation: 'Implementar lazy loading y dynamic imports'
          })
        }
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'bundle-analysis',
        message: `Error analizando bundle: ${error.message}`
      })
    }
  }

  async checkDependencies() {
    console.log('📚 Analizando dependencias...')
    
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
      )
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      }
      
      // Verificar dependencias pesadas conocidas
      const heavyDeps = {
        'moment': 'Considera usar date-fns o dayjs (más ligeros)',
        'lodash': 'Importa funciones específicas en lugar del paquete completo',
        'material-ui': 'Considera usar solo los componentes necesarios'
      }
      
      Object.keys(dependencies).forEach(dep => {
        if (heavyDeps[dep]) {
          this.results.recommendations.push({
            type: 'dependency',
            dependency: dep,
            message: heavyDeps[dep]
          })
        }
      })
      
      // Verificar dependencias no utilizadas (básico)
      const srcPath = path.join(process.cwd(), 'src')
      const srcContent = this.readAllFiles(srcPath)
      
      Object.keys(dependencies).forEach(dep => {
        if (!srcContent.includes(dep) && !dep.startsWith('@types/')) {
          this.results.warnings.push({
            type: 'unused-dependency',
            message: `Dependencia '${dep}' parece no estar en uso`,
            recommendation: 'Verificar si se puede remover'
          })
        }
      })
      
    } catch (error) {
      this.results.errors.push({
        type: 'dependency-analysis',
        message: `Error analizando dependencias: ${error.message}`
      })
    }
  }

  async analyzeComponents() {
    console.log('🎭 Analizando componentes...')
    
    try {
      const componentsPath = path.join(process.cwd(), 'src', 'components')
      if (!fs.existsSync(componentsPath)) return
      
      const componentFiles = this.findFiles(componentsPath, /\.(tsx|jsx)$/)
      let memoizedComponents = 0
      let totalComponents = 0
      
      componentFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8')
        
        // Contar componentes
        const componentMatches = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+\w+|function\s+\w+\s*\()/g)
        if (componentMatches) {
          totalComponents += componentMatches.length
        }
        
        // Verificar memoización
        if (content.includes('memo(') || content.includes('React.memo(')) {
          memoizedComponents++
        } else if (content.includes('export') && content.includes('function')) {
          this.results.recommendations.push({
            type: 'component-optimization',
            file: path.relative(process.cwd(), file),
            message: 'Considera usar React.memo() para optimizar re-renders'
          })
        }
        
        // Verificar hooks de optimización
        if (!content.includes('useCallback') && !content.includes('useMemo') && 
            content.includes('function') && content.length > 1000) {
          this.results.recommendations.push({
            type: 'hooks-optimization',
            file: path.relative(process.cwd(), file),
            message: 'Componente grande sin useCallback/useMemo - revisar optimizaciones'
          })
        }
      })
      
      this.results.bundleSize.components = {
        total: totalComponents,
        memoized: memoizedComponents,
        memoizationRate: totalComponents > 0 ? (memoizedComponents / totalComponents * 100).toFixed(1) : 0
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'component-analysis',
        message: `Error analizando componentes: ${error.message}`
      })
    }
  }

  async checkImages() {
    console.log('🖼️ Analizando imágenes...')
    
    try {
      const publicPath = path.join(process.cwd(), 'public')
      if (!fs.existsSync(publicPath)) return
      
      const imageFiles = this.findFiles(publicPath, /\.(jpg|jpeg|png|gif|webp|svg)$/i)
      let totalImageSize = 0
      let largeImages = []
      
      imageFiles.forEach(file => {
        const stats = fs.statSync(file)
        totalImageSize += stats.size
        
        if (stats.size > 500 * 1024) { // 500KB
          largeImages.push({
            file: path.relative(process.cwd(), file),
            size: this.formatBytes(stats.size)
          })
        }
      })
      
      this.results.bundleSize.images = {
        count: imageFiles.length,
        totalSize: totalImageSize,
        largeImages
      }
      
      if (largeImages.length > 0) {
        this.results.recommendations.push({
          type: 'image-optimization',
          message: `${largeImages.length} imágenes grandes encontradas`,
          recommendation: 'Optimizar imágenes con next/image y formatos modernos (WebP)',
          details: largeImages
        })
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'image-analysis',
        message: `Error analizando imágenes: ${error.message}`
      })
    }
  }

  generateReport() {
    console.log('\n📊 REPORTE DE PERFORMANCE')
    console.log('=' .repeat(50))
    
    // Bundle Size
    if (this.results.bundleSize.static) {
      console.log(`\n📦 Tamaño del Bundle:`)
      console.log(`   Archivos estáticos: ${this.formatBytes(this.results.bundleSize.static.totalSize)}`)
      console.log(`   Archivos: ${this.results.bundleSize.static.fileCount}`)
    }
    
    // Components
    if (this.results.bundleSize.components) {
      const comp = this.results.bundleSize.components
      console.log(`\n🎭 Componentes:`)
      console.log(`   Total: ${comp.total}`)
      console.log(`   Memoizados: ${comp.memoized} (${comp.memoizationRate}%)`)
    }
    
    // Images
    if (this.results.bundleSize.images) {
      const img = this.results.bundleSize.images
      console.log(`\n🖼️ Imágenes:`)
      console.log(`   Total: ${img.count}`)
      console.log(`   Tamaño total: ${this.formatBytes(img.totalSize)}`)
      if (img.largeImages.length > 0) {
        console.log(`   Imágenes grandes: ${img.largeImages.length}`)
      }
    }
    
    // Warnings
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️ Advertencias (${this.results.warnings.length}):`)
      this.results.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning.message}`)
        if (warning.recommendation) {
          console.log(`      💡 ${warning.recommendation}`)
        }
      })
    }
    
    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(`\n💡 Recomendaciones (${this.results.recommendations.length}):`)
      this.results.recommendations.slice(0, 10).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.message}`)
        if (rec.file) {
          console.log(`      📁 ${rec.file}`)
        }
        if (rec.recommendation) {
          console.log(`      🔧 ${rec.recommendation}`)
        }
      })
      
      if (this.results.recommendations.length > 10) {
        console.log(`   ... y ${this.results.recommendations.length - 10} más`)
      }
    }
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errores (${this.results.errors.length}):`)
      this.results.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.message}`)
      })
    }
    
    // Summary
    console.log('\n📈 RESUMEN:')
    const score = this.calculateScore()
    console.log(`   Puntuación de Performance: ${score}/100`)
    
    if (score >= 80) {
      console.log('   🎉 ¡Excelente! Tu aplicación está bien optimizada.')
    } else if (score >= 60) {
      console.log('   👍 Bien, pero hay oportunidades de mejora.')
    } else {
      console.log('   ⚠️ Necesita optimización. Revisa las recomendaciones.')
    }
    
    console.log('\n' + '='.repeat(50))
  }

  calculateScore() {
    let score = 100
    
    // Penalizar por warnings y errores
    score -= this.results.warnings.length * 5
    score -= this.results.errors.length * 10
    score -= this.results.recommendations.length * 2
    
    // Bonus por memoización
    if (this.results.bundleSize.components) {
      const memoRate = parseFloat(this.results.bundleSize.components.memoizationRate)
      if (memoRate > 50) score += 10
    }
    
    return Math.max(0, Math.min(100, score))
  }

  // Utility methods
  getDirectorySize(dirPath) {
    let totalSize = 0
    let fileCount = 0
    
    const files = fs.readdirSync(dirPath)
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file)
      const stats = fs.statSync(filePath)
      
      if (stats.isDirectory()) {
        const subDir = this.getDirectorySize(filePath)
        totalSize += subDir.totalSize
        fileCount += subDir.fileCount
      } else {
        totalSize += stats.size
        fileCount++
      }
    })
    
    return { totalSize, fileCount }
  }

  findFiles(dir, pattern) {
    let results = []
    
    try {
      const files = fs.readdirSync(dir)
      
      files.forEach(file => {
        const filePath = path.join(dir, file)
        const stats = fs.statSync(filePath)
        
        if (stats.isDirectory()) {
          results = results.concat(this.findFiles(filePath, pattern))
        } else if (pattern.test(file)) {
          results.push(filePath)
        }
      })
    } catch {
      // Ignorar errores de acceso a directorios
    }
    
    return results
  }

  readAllFiles(dir) {
    let content = ''
    
    try {
      const files = this.findFiles(dir, /\.(ts|tsx|js|jsx)$/)
      files.forEach(file => {
        try {
          content += fs.readFileSync(file, 'utf8')
        } catch {
          // Ignorar archivos que no se pueden leer
        }
      })
    } catch {
      // Ignorar errores
    }
    
    return content
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Ejecutar auditoría si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const auditor = new PerformanceAuditor()
  auditor.runAudit().catch(console.error)
}

export default PerformanceAuditor