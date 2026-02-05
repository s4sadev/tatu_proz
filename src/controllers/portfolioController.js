const sql = require('../config/db')
const supabase = require('../config/supabase')

exports.uploadPortfolioImage = async (req, res) => {
  try {
    const { file } = req
    if (!file) {
      return res.status(400).json({ error: 'Arquivo obrigatório' })
    }

    // Upload to Supabase storage
    const fileName = `${Date.now()}-${file.originalname}`
    const { data, error } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return res.status(500).json({ error: 'Erro ao fazer upload' })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('portfolio')
      .getPublicUrl(fileName)

    // Save to database
    await sql`
      INSERT INTO portfolio (url)
      VALUES (${urlData.publicUrl})
    `

    res.status(201).json({ message: 'Imagem adicionada ao portfólio', url: urlData.publicUrl })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao adicionar imagem' })
  }
}

exports.getPortfolio = async (req, res) => {
  try {
    const result = await sql`
      SELECT id, url, created_at
      FROM portfolio
      ORDER BY created_at DESC
    `
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar portfólio' })
  }
}

exports.deletePortfolioImage = async (req, res) => {
  const { id } = req.params
  try {
    // Get URL from DB
    const result = await sql`
      SELECT url FROM portfolio WHERE id = ${id}
    `
    if (result.length === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada' })
    }

    const url = result[0].url
    // Extract file name from URL
    const fileName = url.split('/').pop()

    // Delete from Supabase
    const { error } = await supabase.storage
      .from('portfolio')
      .remove([fileName])

    if (error) {
      console.error('Supabase delete error:', error)
    }

    // Delete from DB
    await sql`
      DELETE FROM portfolio WHERE id = ${id}
    `

    res.json({ message: 'Imagem removida' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao remover imagem' })
  }
}