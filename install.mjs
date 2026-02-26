#!/usr/bin/env node
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, rmSync, cpSync } from 'fs'

const SKILL_NAME = 'a11y'
const __dirname = dirname(fileURLToPath(import.meta.url))
const home = homedir()

const agents = [
  { name: 'Claude Code', detect: join(home, '.claude'),               skills: join(home, '.claude', 'skills') },
  { name: 'Cursor',      detect: join(home, '.cursor'),               skills: join(home, '.cursor', 'skills') },
  { name: 'Gemini CLI',  detect: join(home, '.gemini'),               skills: join(home, '.gemini', 'skills') },
  { name: 'Codex',       detect: join(home, '.agents'),               skills: join(home, '.agents', 'skills') },
  { name: 'Windsurf',    detect: join(home, '.codeium'),              skills: join(home, '.codeium', 'windsurf', 'skills') },
  { name: 'Antigravity', detect: join(home, '.gemini', 'antigravity'), skills: join(home, '.gemini', 'antigravity', 'skills') },
]

let installed = 0

for (const { name, detect, skills } of agents) {
  if (existsSync(detect)) {
    const target = join(skills, SKILL_NAME)
    mkdirSync(skills, { recursive: true })
    rmSync(target, { recursive: true, force: true })
    cpSync(__dirname, target, { recursive: true })
    rmSync(join(target, '.git'), { recursive: true, force: true })
    console.log(`✓ ${name} → ${target}`)
    installed++
  }
}

if (installed === 0) {
  console.log('No supported AI agents detected. Copy this folder manually to your agent\'s skills directory.\n')
  for (const { name, skills } of agents) {
    console.log(`  ${name.padEnd(12)} →  ${join(skills, SKILL_NAME)}`)
  }
  process.exit(1)
}

console.log('\nRestart your agent session to load the skill.')
