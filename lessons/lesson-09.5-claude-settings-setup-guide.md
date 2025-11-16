# Lesson 9.5: Claude Complete Setup & Settings Guide

*Master Claude's essential configuration: accessing the platform, selecting the right model, enabling advanced features, and setting up projects and connectors for maximum productivity*

## Why This Lesson Matters

Every other Claude lesson (10-19) assumes you've completed this setup. This lesson answers the questions that come BEFORE you start using Claude: "Where do I access Claude?", "Which model should I use?", "How do I enable Deep Research?", "What are connectors?"

**This is your master reference for all things Claude settings.**

---

## Part 1: Accessing Claude - Where to Find It

### Three Ways to Access Claude

#### Option 1: Claude Web Interface (claude.ai)
**Best for:** Most users - chat, file uploads, projects, connectors

**How to access:**
1. Visit https://claude.ai
2. Sign up (email or Google/GitHub account)
3. You're now in Claude's chat interface
4. **Bookmark this page** - this is where you'll spend most of your time

**What's available on Free:**
- Basic Claude conversations
- File uploads (PDFs, images, documents)
- Standard response speed
- Limited to Claude 3.5 Sonnet

#### Option 2: Claude API (for developers)
**Best for:** Integrating Claude into applications, automation

**How to access:**
1. Visit https://console.anthropic.com
2. Sign in with same account as claude.ai
3. Click "API Keys" in left sidebar
4. Create new API key
5. Store securely (DO NOT share or commit to GitHub)

**Requires:**
- Claude API paid tier
- Billing setup (pay as you go)
- Programming knowledge or integration with zapier/n8n

#### Option 3: Claude via Workspace Integration (Gmail, Slack, etc.)
**Best for:** Using Claude directly in tools you already use

**How to access:**
- Gmail: Visit https://workspace.google.com → Apps → Claude
- Slack: Slack App Store → Search "Claude" → Install
- Teams: Microsoft Teams App Store → Search "Claude"
- Requires: Workspace admin rights + Claude Pro subscription

---

## Part 2: Subscription Tiers - What You Get at Each Level

### Claude Free Tier
**Cost:** $0

**Includes:**
- ✅ Claude 3.5 Sonnet (standard access)
- ✅ Web interface (claude.ai)
- ✅ File uploads and attachments
- ✅ Projects (basic)
- ✅ Conversation history
- ✅ Standard response speed

**Does NOT include:**
- ❌ Deep Research mode
- ❌ Extended Thinking
- ❌ Claude Pro features
- ❌ Higher rate limits
- ❌ Workspace connectors

**Best for:** Learning, casual use, testing capabilities

### Claude Pro
**Cost:** $20/month

**Includes everything from Free PLUS:**
- ✅ **Deep Research mode** (real-time web search + analysis)
- ✅ **Extended Thinking** (advanced reasoning)
- ✅ **Claude 4.5 Sonnet** (can switch between models)
- ✅ Higher rate limits (more conversations per day)
- ✅ Priority access during peak times
- ✅ Artifacts (interactive code/document creation)
- ✅ Advanced Projects
- ✅ Connectors (Gmail, Slack, Docs, Sheets)

**Cost implications:**
- Base fee: $20/month
- Deep Research: +$1-5 per search (depending on complexity)
- Normal conversations: Included

**Best for:** Professionals, frequent users, power features

### Claude API (For Developers)
**Cost:** Pay-as-you-go based on token usage

**Pricing structure (as of 2025):**
- Claude 3.5 Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- Claude 4: Higher cost, more capable
- Example: 1000-token conversation costs ~$0.01

**Includes:**
- ✅ Programmatic access (via API)
- ✅ Any Claude model version
- ✅ Fine-tuning capabilities
- ✅ Batch processing
- ✅ Higher rate limits (enterprise scale)

**Does NOT include:**
- ❌ Web interface features
- ❌ Projects
- ❌ Connectors
- ❌ Interactive artifacts

**Best for:** Developers building Claude into applications

---

## Part 3: Model Selection - Which Claude Version to Use

### Available Claude Models (2025)

#### Claude Sonnet 4.5 (Recommended, Most Capable)
**When to use:** 95% of your work - default choice for best quality

**Strengths:**
- Most intelligent Claude model available (September 2025)
- #1 on SWE-bench for software engineering tasks
- Excellent at writing, analysis, coding, complex reasoning
- Best code generation and problem-solving
- Good balance of speed and intelligence
- Most cost-effective for quality

**Limitations:**
- Slightly slower than Haiku (but still fast)
- Larger context window (200K tokens)

**Access:** Pro tier and API

---

#### Claude Opus 4.1 (Maximum Reasoning Power)
**When to use:** Most complex reasoning tasks, specialized analysis, advanced problem-solving

**Strengths:**
- Exceptional reasoning and analysis capabilities
- Best for highly complex tasks requiring deep thinking
- Excellent for specialized reasoning and research
- Superior on tasks requiring maximum intelligence
- Advanced multi-step problem solving

**Limitations:**
- Most expensive model ($15 input / $75 output per million tokens)
- Slower than Sonnet 4.5
- Overkill for simple or routine tasks

**Access:** Pro tier and API only (most capable tier required)

**When Sonnet 4.5 isn't enough:**
- Use Opus when Sonnet 4.5 struggles with complex reasoning
- For tasks requiring absolute best possible results
- Legal/contract analysis, strategic decision-making, deep research
- Complex math, coding architecture, specialized domains

---

#### Claude Haiku 4.5 (Fast & Efficient)
**When to use:** Speed-critical tasks, high volume, routine work

**Strengths:**
- Fastest Claude model
- Excellent for simple tasks and high-volume work
- Great cost-effective option
- Good at writing and analysis

**Limitations:**
- Less capable on very complex reasoning than Sonnet
- Smaller context window (200K tokens, but sufficient for most)

**Access:** Pro tier and API

---

#### Claude 3.5 Sonnet (Legacy)
**When to use:** Rarely - compatibility with older systems

**Note:** Claude Sonnet 4.5 is better in nearly all cases - use it instead

**Access:** API (deprecated on claude.ai)

---

### How to Switch Models in Claude.ai

**Current version indicator:**
- Top of chat window shows "Claude Sonnet 4.5" (or other model name)
- This IS a dropdown for Claude Pro subscribers

**To switch models (Claude Pro only):**
1. Look at top of chat window
2. Click on model name (where it says "Claude Sonnet 4.5")
3. Select from dropdown:
   - **Claude Sonnet 4.5** (recommended default - best balance of quality, speed, and cost)
   - **Claude Opus 4.1** (when you need maximum reasoning power for complex tasks)
   - **Claude Haiku 4.5** (when you need speed - fastest option for routine work)
4. Start new conversation - model doesn't change mid-conversation

**Pro tip:**
- **Default:** Start with Claude Sonnet 4.5 for 95% of work
- **Power users:** Use Opus 4.1 when Sonnet struggles with complex reasoning
- **Speed:** Use Haiku 4.5 for routine tasks or high-volume work when speed matters

---

## Part 4: Advanced Features - Deep Research & Extended Thinking

### Deep Research Mode (Pro Only)

**What it does:**
- Searches the internet in real-time
- Gathers current information
- Synthesizes findings into comprehensive analysis
- Perfect for research, competitive analysis, current events

**How to enable:**
1. In claude.ai, start a new conversation
2. Look for "Preferences" or settings icon (⚙️) in top right
3. Scroll down to find "Deep Research" toggle
4. Turn it ON

**How to use it:**
- Type your research question normally
- Claude will display "Searching the web..." indicator
- Waits for results before responding
- Responses include source citations

**Cost implications:**
- Each Deep Research query: $1-5 depending on complexity
- NOT included in Pro base fee
- Charged separately to your Claude account

**Example usage:**
- "What's the current competitive landscape in AI startups?" → Searches and synthesizes recent news
- "Analyze latest earnings reports from top 3 cloud providers" → Gathers current data
- "What are people saying about [new product] on Twitter/Reddit?" → Real-time sentiment analysis

**When to use:**
- ✅ Need current information (news, prices, trends)
- ✅ Competitive research or market analysis
- ✅ Finding recent case studies or examples
- ❌ For information in Claude's training data (slower, costs money)

---

### Extended Thinking Mode (Pro Only)

**What it does:**
- Claude thinks through complex problems step-by-step
- Shows its reasoning process
- More accurate on difficult tasks
- Takes longer but produces better results

**How to enable:**
1. Start conversation in claude.ai
2. Click settings/preferences (⚙️)
3. Find "Extended Thinking" toggle
4. Turn it ON

**How to use it:**
1. Type your complex question
2. Watch as Claude displays "Thinking..." with progress
3. Claude shows thinking process, then final answer
4. Can ask follow-up questions on the thinking

**Cost implications:**
- Slight increase in token usage
- Included in Pro tier (no extra charge)
- API: Additional cost per token

**Example usage:**
- Complex math problems → "Thinking: Let me work through this step-by-step"
- Debugging code → Shows reasoning about bug sources
- Strategic decisions → Displays pros/cons analysis
- Legal/contract review → Shows detailed interpretation

**When to use:**
- ✅ Complex reasoning required
- ✅ Need to see HOW Claude got the answer
- ✅ Critical decisions needing deep analysis
- ❌ Simple questions (slower, unnecessary)

**Pro tip:** Combine with Deep Research for ultimate power - research the topic + extend thinking on findings

---

## Part 5: Projects - Organizing Your Work & Building Context

**What are Projects?**

A Project is a container for:
- Multiple conversations about related topics
- Shared knowledge/documents
- Custom context that carries across conversations

Think of it like a "workspace" for a specific topic or project.

### How to Create a Project

**In claude.ai:**
1. Left sidebar → Click "+" button
2. Select "Create Project"
3. Name it (e.g., "Marketing Campaign Q1 2025")
4. Add optional description
5. Click Create

### How to Build Project Context

**You can add to your project:**
- **Files:** PDFs, documents, code files, images
- **Links:** Paste URLs for Claude to analyze
- **Chat history:** Previous conversations
- **Instructions:** Custom system prompts for how Claude should behave

**How to add files:**
1. Create/open project
2. Click "Add Files" button
3. Upload documents (PDFs, Word, images, code files)
4. Claude indexes and understands them

**How to add custom instructions:**
1. In project, click "Settings" (⚙️)
2. Add "Custom Instructions" for this project
3. Example: "For this project, always format reports as executive summaries"

### Using Projects in Conversations

Once you've built a project:
1. Start conversation in that project
2. Type normally - Claude automatically uses all project context
3. Can reference documents without uploading each time
4. Ask follow-up questions that build on previous conversations

**Example:** Build project for "Company Strategy"
- Upload: 3 years of financial reports
- Add: Competitor analysis documents
- Add: Custom instruction: "Always relate recommendations to our core values"
- Now every conversation in this project has full context

---

## Part 6: Connectors - Integrating Claude with Gmail, Slack & More

**What are Connectors?**

Connectors let Claude read and interact with your other tools (Gmail, Slack, Google Docs, Sheets).

**Available connectors (Pro tier only):**
- Gmail (read emails, compose messages)
- Slack (read messages, post to channels)
- Google Docs (read and edit documents)
- Google Sheets (read and modify spreadsheets)
- GitHub (browse repositories, pull code)
- More coming regularly

### How to Set Up Connectors

**Step 1: Enable connector in Claude**
1. Visit claude.ai
2. Settings (⚙️) → Connected Apps
3. Select connector you want to add (e.g., "Gmail")
4. Click "Connect"

**Step 2: Grant permissions**
- Claude will ask for permission to access Gmail
- You'll be redirected to Google account
- Review permissions
- Click "Allow"

**Step 3: Approve access in Claude**
- Back in Claude
- You'll see confirmation message
- Connector is now active

### Using Connectors in Conversations

**Example 1: Draft email response**
1. In conversation, say: "Look at my latest Gmail and draft a professional response"
2. Claude reads your email (with permission)
3. Drafts response for your review
4. You edit and send manually

**Example 2: Summarize Slack channel**
1. Say: "What's the summary of this week's #marketing channel?"
2. Claude reads channel messages
3. Provides summary with key decisions/action items

**Example 3: Update spreadsheet**
1. Connect Google Sheets
2. Say: "Based on our sales data, update the Q4 forecast in my spreadsheet"
3. Claude modifies the sheet directly (with your approval)

**Privacy note:**
- Claude can see any email/message/doc you grant access to
- You control what gets shared
- Can revoke access anytime in Settings

---

## Part 7: API Keys & Authentication (For Developers)

### Getting Your API Key

**Prerequisites:**
- Claude.ai account
- Valid payment method for billing

**How to get API key:**
1. Visit https://console.anthropic.com
2. Sign in (same account as claude.ai)
3. Click "API Keys" in left sidebar
4. Click "Create Key"
5. Copy key (only visible once)
6. Store securely

### Storing Your API Key Safely

**NEVER:**
- ❌ Paste in code files
- ❌ Commit to GitHub
- ❌ Share with anyone
- ❌ Hardcode in scripts

**DO:**
- ✅ Store in `.env` file (add to .gitignore)
- ✅ Use environment variables
- ✅ Store in secure secret manager
- ✅ Rotate regularly

**Example `.env` file:**
```
ANTHROPIC_API_KEY=sk-ant-v0-abc123xyz...
```

**In your code:**
```python
import os
from anthropic import Anthropic

api_key = os.getenv("ANTHROPIC_API_KEY")
client = Anthropic(api_key=api_key)
```

### API Rate Limits & Billing

**Rate limits by tier:**
- Free/Pro: Limited by number of conversations (fair usage)
- API: Billed per token (input + output)
- Example: 1000 tokens input + 500 tokens output = charged for 1500 tokens

**Cost estimation:**
- Small task (summarize email): ~100 tokens = $0.001
- Medium task (code review): ~1000 tokens = $0.015
- Large task (analyze 50-page document): ~10,000 tokens = $0.15

---

## Part 8: Common Settings & Preferences

### In claude.ai Settings (⚙️)

**Available settings:**

| Setting | What it does | Recommended |
|---------|------------|------------|
| Dark Mode | Changes theme | Your preference |
| Chat History | Saves conversations | Keep ON |
| Code Syntax Highlighting | Highlights code blocks | Keep ON |
| Artifacts | Shows code/documents in sidebar | Keep ON |
| Data Controls | Controls what happens to conversations | Review for privacy |

### Data Controls - Important Privacy Setting

**Where to find:** Settings → Data Controls

**Options:**
- **"Allow Claude to improve itself"** - Your conversations help train Claude (OFF if privacy-critical)
- **"Enable chat history"** - Your conversations persist (ON for productivity)
- **"Download data"** - Export all your conversations as backup

---

## Part 9: Troubleshooting Common Issues

### "I can't enable Deep Research"
- **Solution:** Make sure you have Claude Pro (not Free tier)
- **Check:** Settings → Your subscription level

### "Extended Thinking is grayed out"
- **Solution:** You need Pro tier
- **Alternative:** Use standard Claude 4.5 Sonnet without Extended Thinking

### "Connector won't authenticate"
- **Solution:** Grant proper permissions in Google/Slack account
- **Try:** Remove and re-add the connector

### "API Key isn't working"
- **Solution:** Check key is stored in correct environment variable
- **Try:** Regenerate new key in console.anthropic.com
- **Verify:** No extra spaces in the API key

### "Projects are loading slowly"
- **Solution:** Projects with many large files can be slow
- **Try:** Archive old projects or split into smaller projects

---

## Part 10: Quick Reference - Settings Checklist

Before using any Claude lesson (10-19), verify you've completed:

- [ ] **Access:** I can login to https://claude.ai
- [ ] **Model:** I understand which model I'm using (3.5 Sonnet for speed, 4.5 Sonnet for complexity)
- [ ] **Subscription:** I know what tier I'm on (Free / Pro) and what I can use
- [ ] **Features:** I know how to enable/disable Deep Research and Extended Thinking when needed
- [ ] **Projects:** I understand how to create and use Projects for organized work
- [ ] **Connectors:** (If Pro) I know how to connect Gmail/Slack if lessons require it
- [ ] **Settings:** I've reviewed Privacy settings and Dark Mode preference

---

## Summary

You now understand:
1. ✅ Where to access Claude (claude.ai, API, or workspace apps)
2. ✅ Which subscription tier gives you which features
3. ✅ How to select the right Claude model for your task
4. ✅ How to enable Deep Research for current information
5. ✅ How to enable Extended Thinking for complex reasoning
6. ✅ How to build Projects with context and knowledge
7. ✅ How to connect Claude to Gmail, Slack, and other tools
8. ✅ How to get API keys and authenticate for developers

**Next steps:**
- Return to **Lesson 10: Claude Fundamentals** to start learning Claude's core capabilities
- Or jump to **Lesson 11: Claude Research & Analysis** if you want deep research features
- Or explore **Lesson 15: Claude Projects** to master context-building

This lesson is your master reference - bookmark it and return whenever you need to troubleshoot or learn a new setting!
