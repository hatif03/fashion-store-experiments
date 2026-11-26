# Traffic

Real visits to the homepage of https://stillform-sepia.vercel.app. A visitor who lands on a product page never enters EXP-001, so every public link points at `/`.

Posts say it is a demo clothing store running an experiment. They do not say what the two versions are, and they do not ask anyone to refresh until the page changes. Mark your own browser with `?internal=1` before you click any of these, including to test them.

## Reviewers

Open `?internal=1` once. That browser stays out of the result until `?internal=0`.

| What | Link |
| --- | --- |
| Mark this browser | https://stillform-sepia.vercel.app/?internal=1 |
| Control | https://stillform-sepia.vercel.app/?internal=1&preview=rail |
| The other version | https://stillform-sepia.vercel.app/?internal=1&preview=grid |
| Live map | https://stillform-sepia.vercel.app/live?internal=1 |
| A suggested size | https://stillform-sepia.vercel.app/products/heavyweight-tee?internal=1&preview.size_suggestion=suggested |
| Complete the look removed | https://stillform-sepia.vercel.app/products/heavyweight-tee?internal=1&preview.complete_the_look=hidden |
| The associate speaks | https://stillform-sepia.vercel.app/products/heavyweight-tee?internal=1&preview.associate_greeting=speaks |
| The phone bar adds | https://stillform-sepia.vercel.app/products/heavyweight-tee?internal=1&preview.buy_bar=adds |

## Links to post

One link per channel, so the live page can show where people came from. Add a row to the log below when a post goes up.

| Channel | When | Link |
| --- | --- | --- |
| WeMakeDevs Discord | Fri, late morning and once in the evening | https://stillform-sepia.vercel.app/?utm_source=wemakedevs&utm_medium=chat&utm_campaign=togglewars |
| Flagsmith Discord | Fri, in the hackathon channel | https://stillform-sepia.vercel.app/?utm_source=flagsmith&utm_medium=chat&utm_campaign=togglewars |
| X | Fri evening, then Sat | https://stillform-sepia.vercel.app/?utm_source=x&utm_medium=post&utm_campaign=togglewars |
| LinkedIn | Fri late morning | https://stillform-sepia.vercel.app/?utm_source=linkedin&utm_medium=post&utm_campaign=togglewars |
| Peerlist | Fri daytime | https://stillform-sepia.vercel.app/?utm_source=peerlist&utm_medium=post&utm_campaign=togglewars |
| r/SideProject | Sat, if the account meets that subreddit's rules | https://stillform-sepia.vercel.app/?utm_source=reddit&utm_medium=post&utm_campaign=togglewars |
| r/webdev Showoff Saturday | Sat, in the weekly thread | https://stillform-sepia.vercel.app/?utm_source=reddit-webdev&utm_medium=comment&utm_campaign=togglewars |
| dev.to | Sat morning | https://stillform-sepia.vercel.app/?utm_source=devto&utm_medium=post&utm_campaign=togglewars |
| daily.dev | Sat, submit the dev.to post | https://stillform-sepia.vercel.app/?utm_source=dailydev&utm_medium=post&utm_campaign=togglewars |
| Show HN | Sat, about 19:30 IST | https://stillform-sepia.vercel.app/?utm_source=hackernews&utm_medium=post&utm_campaign=togglewars |

A second pass on Sunday morning, on X and the two Discords, can point at the live map as well as the store: https://stillform-sepia.vercel.app/live

## Where a visit actually comes from

The scorecard stays blank until each version has 50 identities and 5 conversions, so the useful target is on the order of 100 people who open the homepage and look at a piece. A few places produce that. Most posts do not.

1. **Trade visits with other Toggle Wars projects.** This is the reliable source. Open five other projects, leave a specific comment, and ask them to open yours. Do it in the WeMakeDevs and Flagsmith Discords, where the people are already building experiments.
2. **A short recording of the rail.** Pull one piece down. That interaction is the reason to click. Post the clip on X, tag @flagsmith and @WeMakeDevs, and put the same clip on LinkedIn. Post when those feeds are awake: late morning IST for LinkedIn, evening IST for X. A post at dawn sits unseen.
3. **Saturday communities, once each.** r/webdev's Showoff Saturday thread, r/SideProject, Peerlist, one dev.to post submitted to daily.dev, and Show HN around 19:30 IST (morning on the US east coast). Read each place's rules first. Show HN's title can be "Show HN: STILLFORM – a demo clothing store with an interactive rail".
4. **People you can actually message.** A note to someone who already posted their own hackathon project converts better than another public copy of the same text.

The same paragraph everywhere gets removed. Write it in the voice of that place. A usable core, with the channel's link on the end:

> STILLFORM is a small demo clothing store. The homepage is an interactive rail: pull a piece down to see it. Checkout is a demo, so nothing is charged. It's part of a public experiment, which means the page can differ slightly from someone else's. If you have a minute, open it on your phone too.

Don't buy traffic, don't ask a group to click in exchange for nothing, and don't send scripted sessions at the production site. If Sunday 10:00 IST arrives with either version under Flagsmith's floor, scripted traffic runs in a separate Flagsmith environment and the write-up says so.

## Log

| Posted (IST) | Channel | `utm_source` | Link to post | Visits after 24 h | Notes |
| --- | --- | --- | --- | --- | --- |
