import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { prisma } from '../../index'
import { config } from '../../config/settings'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) { res.status(400).json({ error: 'username and password required' }); return }
  const user = await prisma.adminUser.findUnique({ where: { username } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' }); return
  }
  const token = jwt.sign(
    { id: user.id, username: user.username },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN as StringValue }
  )
  res.json({ token })
})

export default router
