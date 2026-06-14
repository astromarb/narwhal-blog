## Welcome to narwhal-blog 
This repo is both my personal blog and a public, open-source template for a secure personal blog site that anyone can utilize and share. The files directly in the repository
mirror the posts live in my blog site. You can inspect those if you're curious about how the .md is rendered on the website. Instructions for how to deploy a copy of this site for your own use are below. 


### Features
- Animated, square-dominant, 'field-journal' style theme.
- Cover image and featured post (latest). 
- Tagging system for posts with visual outputs.
- Unique, shareable link for each post.
- Admin dashboard (password protected). 

<img width="530" height="202" alt="image" src="https://github.com/user-attachments/assets/d05d8d88-b978-4c31-a686-d76bbff26ee6" />
<img width="408" height="57" alt="image" src="https://github.com/user-attachments/assets/89b6f670-94e9-4b05-a1cf-73db648372ac" />

## Architecture and Setup
#### Tech Stack
The website tech stack consists of Framework Next.js 16 and is written in TypeScript 5. The styling is in plain CSS using custom properties (no Tailwind is used).
For local editing/testing, Node version 18+ is required. **A verified deployment pathway is using [Vercel](https://vercel.com/)**. 


#### Deploying
**If you are trying to create a quick personal blog site, I highly reccommend creating a free account on Vercel and connecting your project to your GitHub account.**
Vercel is a cloud platform built for the AI era that makes hosting websites and applications on the internet fast and easy with a relatively small learning curve. Other cloud providers and self-hosting will suffice, but may require more setup.
**At the time of writing this (June 14th, 2026), Vercel makes deployment of this and other web apps extremely easy with 'drag-and-drop' deployment and generous free-tier monthly usage limits for Hobbyists.** 

**To get started:**
1) Clone this repository
2) Select it directly on Vercel for deployment as a Project. The deployment agent will handle the installation automatically. I've had no issues deploying both Preview and Production builds of [my blog](https://blog.marvinlopezacevedo.com) throughout testing and continuous usage.
3) Copy and edit the blog post .md template in 'public' to draft your own posts. The easiest way to draft is by using GitHub's editor or a custom markdown editor like Obsidian. Alternatively, you can draft/edit posts in the online administrative dashboard at the sites' /admin sub-page. 
4) Commit your new posts under 'content/posts' (be sure to fill out the post metadata). By default, commits to the main branch are pushed to the live Production build of the site. You can configure this in Vercel for Preview builds to inspect updates live before promoting to Production.  
5) Once the deployment check completes, the website will be updated right away. 
6) To change the header photo, replace 'headshot.jpg' in 'public'.

All of this is available through Vercel's project management code-free. 

##### Domain Names
By default, the deployed site will use a Vercel generated domain. This is fine for most people who are looking to document their writing and get practice with deploying a site. If you own your own domain name and want to use a custom subdomain (ex. blog.yoursite.com):
1) Go to Domains inside of the Vercel project for the blog site you deployed
2) Type in your desired subdomain directly and press 'Enter'. The alias will be automatically created and a key will be generated and displayed after a pause.
3) Paste the key from Vercel into your Domain DNS management dashboard. If Vercel is your domain provider, this step wont be necessary.
4) Ensure you create a corresponding CNAME entry with the matching subdomain on your DNS dashboard if not using Vercel.




