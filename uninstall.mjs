#!/usr/bin/env node
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

const SKILL_NAME = 'a11y'
const home = homedir()

const agents = [
  { name: 'Claude Code', skills: join(home, '.claude', 'skills') },
  { name: 'Cursor',      skills: join(home, '.cursor', 'skills') },
  { name: 'Gemini CLI',  skills: join(home, '.gemini', 'skills') },
  { name: 'Codex',       skills: join(home, '.agents', 'skills') },
  { name: 'Windsurf',    skills: join(home, '.codeium', 'windsurf', 'skills') },
  { name: 'Antigravity', skills: join(home, '.gemini', 'antigravity', 'skills') },
]

let removed = 0

for (const { name, skills } of agents) {
  const target = join(skills, SKILL_NAME)
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
    console.log(`✓ ${name} → removed from ${target}`)
    removed++
  }
}

if (removed === 0) {
  console.log('Skill not found in any agent directory.')
  process.exit(0)
}

console.log('\nRestart your agent session to unload the skill.')
