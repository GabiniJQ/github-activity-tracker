#!/usr/bin/env node
import https from 'https'

const args = process.argv.slice(2)
const user = args[0]
const url = `https://api.github.com/users/${user}/events`

const options = {
  headers: {
    'User-Agent': 'Node.js', // GitHub API requires a User-Agent header
  },
}

const getUserActivity = () => {
  https
    .get(url, options, (res) => {
      let data = ''

      // Collect data chunks
      res.on('data', (chunk) => {
        data += chunk
      })

      // When data is fully received
      res.on('end', () => {
        try {
          const userData = JSON.parse(data)

          // Find latest event
          const latestDate = userData
            .map((event) => event.created_at)
            .reduce((latest, current) =>
              new Date(current) > new Date(latest) ? current : latest
            )

          // Function to organize events by repository
          function organizeEvents(userData) {
            const result = {}

            userData.forEach(({ type, repo, payload }) => {
              const repoName = repo.name

              // Initialize the repository object if it doesn't exist
              if (!result[repoName]) {
                result[repoName] = {
                  pushEvents: { counter: 0 },
                  pullRequestEvents: { counter: 0 },
                  issuesEvents: { actions: [] },
                  watchEvents: { counter: 0 },
                }
              }

              // Increment counters based on event type
              switch (type) {
                case 'PushEvent':
                  result[repoName].pushEvents.counter += payload.commits.length
                  break
                case 'PullRequestEvent':
                  result[repoName].pullRequestEvents.counter++
                  break
                case 'IssuesEvent':
                  result[repoName].issuesEvents.actions.push(payload.action)
                  break
                case 'WatchEvent':
                  result[repoName].watchEvents.counter++
                  break
              }
            })

            return result
          }

          // Call the function
          const structuredData = organizeEvents(userData)
          // Loggin Activity

          // Date
          console.log(`Latest activity registred at: ${latestDate}`)

          // Events
          for (const repo in structuredData) {
            const repoData = structuredData[repo]

            const commits = repoData.pushEvents.counter
            const pullRequests = repoData.pullRequestEvents.counter
            const issues = repoData.issuesEvents.actions
            const stars = repoData.watchEvents.counter

            if (commits > 0) {
              console.log(
                `Pushed ${commits} commit${commits > 1 ? 's' : ''} to ${repo}`
              )
            }
            if (pullRequests > 0) {
              console.log(`Handled ${pullRequests} pull requests on ${repo}`)
            }
            if (issues.length > 0) {
              console.log(
                `Handled issues (action${issues > 1 ? 's' : ''}: ${issues.join(
                  ' ,'
                )}) in ${repo}`
              )
            }
            if (stars) {
              console.log(`Starred ${repo}`)
            }
          }
        } catch (error) {
          console.error('Error parsing JSON:', error)
        }
      })
    })
    .on('error', (err) => {
      console.error('Request failed:', err)
    })
}

if (!user) {
  console.log('Please enter a valid user.')
  process.exit(1)
} else {
  console.log(`Recent Github activity summary of ${user}: `)
  getUserActivity()
}
