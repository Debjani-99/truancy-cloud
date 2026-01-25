This is a Truancy Cloud [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The project is also set up to be containerized with Docker and deployed to NRP (using Kubernetes).

- **Note:** Deployment is handled separately using Docker/Kubernetes.

## One-time setup

```bash
git clone <repo-url>
cd truancy-cloud
```

## Before you start: pull the latest main

This makes sure you’re not building on old code.

```bash
git checkout main
git pull origin main
```

## Getting Started (Local Development)

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.


## Create a new branch (Please don’t work on main)

Before making changes, create a new branch:

```bash
git checkout -b your-branch-name
```
This creates a new branch and switches you to it.

- Check which branch you are on:

```bash
git branch
```


## Pushing Your Branch

After making changes:

```bash
git add .
git commit -m "your message"
```

Then:

First push of a new branch:

```bash
git push -u origin your-branch-name
```

After that, for the SAME branch, future pushes are just:

```bash
git push
```

## Create a Pull Request (PR) on GitHub

- Go to GitHub

- Click Pull requests tab → New pull request

- Base branch: main

- Compare branch: your-branch-name

- Click **Create pull request**

## After PR merged: update your local main

```bash
git checkout main
git pull origin main
```
Now you’re synced.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.



