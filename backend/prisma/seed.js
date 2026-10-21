const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');
const { htxFarmers, htxSeasons, farmPlots, farmLogs, forumPosts } = require('../src/data/mockData');

const toDate = (value) => {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe-123!';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@mobiagri.local' },
    update: { passwordHash, name: 'Quản trị viên', role: 'admin' },
    create: { email: process.env.SEED_ADMIN_EMAIL || 'admin@mobiagri.local', passwordHash, name: 'Quản trị viên', role: 'admin' }
  });

  const farmerIds = [];
  for (const farmer of htxFarmers) {
    const { id, ...farmerData } = farmer;
    const saved = await prisma.farmer.upsert({
      where: { phone: farmer.phone },
      update: farmerData,
      create: farmerData
    });
    farmerIds.push(saved.id);
  }

  const seasonIds = [];
  for (const season of htxSeasons) {
    const { id, ...seasonData } = season;
    const saved = await prisma.season.upsert({
      where: { id: season.id },
      update: { ...seasonData, startDate: toDate(season.startDate), harvestDate: toDate(season.harvestDate) },
      create: { id: season.id, ...seasonData, startDate: toDate(season.startDate), harvestDate: toDate(season.harvestDate) }
    });
    seasonIds.push(saved.id);
  }

  for (const [index, plot] of farmPlots.entries()) {
    const { id, ...plotData } = plot;
    await prisma.farmerPlot.upsert({
      where: { id: plot.id },
      update: { ...plotData, farmerId: farmerIds[index % farmerIds.length], seasonId: seasonIds[index % seasonIds.length] },
      create: { id: plot.id, ...plotData, farmerId: farmerIds[index % farmerIds.length], seasonId: seasonIds[index % seasonIds.length] }
    });
  }

  for (const log of farmLogs) {
    const plot = await prisma.farmerPlot.findFirst({ where: { name: log.plotName } });
    if (plot) {
      await prisma.cropLog.upsert({
        where: { id: log.id },
        update: { plotId: plot.id, date: new Date(log.date), activity: log.activity, item: log.item, quantity: log.quantity, notes: log.notes },
        create: { id: log.id, plotId: plot.id, date: new Date(log.date), activity: log.activity, item: log.item, quantity: log.quantity, notes: log.notes }
      });
    }
  }

  for (const post of forumPosts) {
    const saved = await prisma.communityPost.upsert({ where: { id: post.id }, update: { author: post.author, title: post.title, content: post.content, tags: post.tags.join(',') }, create: { id: post.id, author: post.author, title: post.title, content: post.content, tags: post.tags.join(',') } });
    for (const comment of post.comments) {
      await prisma.comment.upsert({ where: { id: comment.id }, update: { postId: saved.id, author: comment.author, content: comment.content }, create: { id: comment.id, postId: saved.id, author: comment.author, content: comment.content, createdAt: new Date(comment.createdAt) } });
    }
  }
}

main().finally(() => prisma.$disconnect());
