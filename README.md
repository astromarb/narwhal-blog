## Welcome to narwhal-blog. 
This repo is both my personal blog and a public, open-source template for a secure personal blog site that anyone can utilize and share. The files directly in the repository
mirror the posts live in my blog site. You can inspect those if you're curious about how the .md is rendered on the website. Instructions for how to deploy a copy of this site for your own use are below. 


## Architecture and Setup
#### Tech Stack
The website tech stack consists of Framework Next.js 16 and is written in TypeScript 5. The styling is in plain CSS using custom properties (no Tailwind is used).
Node version 18 or highher is required, and **a tested deployment pathway is using [Vercel](https://vercel.com/)**. 


#### Deploying
**If you are trying to create a quick personal blog site, I highly reccommend creating a free account on Vercel and connecting your project to your GitHub account.**
Vercel is a cloud platform built for the AI era that makes hosting websites and applications on the internet fast and easy with a relatively small learning curve. Other cloud providers and self-hosting will suffice, but may require more setup.
**At the time of writing this (June 14th, 2026), Vercel makes deployment of this and other web apps extremely easy with 'drag-and-drop' deployment and generous free-tier monthly usage limits for Hobbyists.** 

**To get started: **
1) Clone this repository
2) Select it directly on Vercel for deployment as a Project. The deployment agent will handle the installation automatically. I've had no issues deploying both Preview and Production builds of [my blog](https://blog.marvinlopezacevedo.com) throughout testing and continuous usage.
3) Use the blog post .md template in the repository to draft your own posts. You can draft using GitHub's editor or a custom application or a custom markdown editor like Obsidian.
4) Commit your new posts under 'content/posts' (be sure to fill out the post metadata). By default, commits to the main branch are pushed to the live Production build of the site. You can configure this in Vercel for Preview builds to inspect updates live before promoting to Production.  
5) Once the deployment check completes, a Vercel domain will be automatically generated.

All of this is available through Vercel's project management code-free. 

##### Domain Names
By default, the deployed site will use a Vercel generated domain. This is fine for most people who are looking to document their writing and get practice with deploying a site.
If you own your own domain name and want to use a custom subdomain (ex. blog.yoursite.com), go to Domains inside of the Vercel project for the blog site you deployed and type in your desired subdomain directly. 
Press 'Enter' and an alias will be automatically created. From there, you'll have to paste the key from Vercel into your Domain DNS management dashboard. If Vercel is your domain provider, this step wont be necessary, you'll just be automatically connected. 



