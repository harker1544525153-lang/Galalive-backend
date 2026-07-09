const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');
const isProduction = process.env.NODE_ENV === 'production';

class FileDatabase {
  constructor() {
    this.tables = {};
    this.autoIncrement = {};
    this.hasLoaded = false;
  }

  load() {
    if (this.hasLoaded) return;
    
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      this.tables = parsed.tables || {};
      this.autoIncrement = parsed.autoIncrement || {};
      
      const hasData = Object.keys(this.tables).length > 0 && 
        Object.values(this.tables).some(table => table.length > 0);
      
      if (!hasData) {
        this.initDefaultData();
      }
    } catch {
      this.initDefaultData();
    }
    
    this.hasLoaded = true;
  }

  save() {
    if (isProduction) return;
    
    const data = {
      tables: this.tables,
      autoIncrement: this.autoIncrement
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  createTable(name) {
    if (!this.tables[name]) {
      this.tables[name] = [];
      this.autoIncrement[name] = 1;
    }
  }

  prepare(sql) {
    return new PreparedStatement(sql, this);
  }

  run(sql, params = []) {
    const stmt = new PreparedStatement(sql, this);
    const result = stmt.run(...params);
    this.save();
    return result;
  }

  all(sql, params = []) {
    const stmt = new PreparedStatement(sql, this);
    return stmt.all(...params);
  }

  get(sql, params = []) {
    const stmt = new PreparedStatement(sql, this);
    return stmt.get(...params);
  }

  close() {}

  initDefaultData() {
    this.tables = {};
    this.autoIncrement = {};
    
    this.createTable('users');
    this.createTable('streams');
    this.createTable('stream_viewers');
    this.createTable('gifts');
    this.createTable('gift_records');
    this.createTable('messages');
    this.createTable('follows');
    this.createTable('video_favorites');
    this.createTable('transactions');
    this.createTable('banners');
    this.createTable('categories');
    this.createTable('admins');
    this.createTable('reports');
    this.createTable('videos');
    this.createTable('notifications');
    this.createTable('blacklists');
    this.createTable('system_logs');
    this.createTable('articles');
    this.createTable('id_certifications');
    this.createTable('level_configs');
    this.createTable('configs');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.tables['users'] = [
      { id: 1, username: 'host1', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138001', nickname: '才艺主播小美', is_host: 1, host_status: 'approved', level: 10, host_level: 5, exp: 2500, host_exp: 3500, coins: 10000, diamonds: 5000, status: 'active', signature: '唱歌跳舞样样精通~', gender: 'female', address: '北京', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20female%20singer%20stage%20purple%20pink%20gradient%20background%20live%20streaming&image_size=landscape_16_9', created_at: now },
      { id: 2, username: 'host2', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138002', nickname: '游戏大神阿杰', is_host: 1, host_status: 'approved', level: 15, host_level: 8, exp: 8000, host_exp: 12000, coins: 25000, diamonds: 12000, status: 'active', signature: '王者百星主播，带飞全场！', gender: 'male', address: '上海', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=gaming%20esports%20neon%20lights%20blue%20purple%20gradient%20cyber%20background&image_size=landscape_16_9', created_at: now },
      { id: 3, username: 'host3', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138003', nickname: '户外探险家', is_host: 1, host_status: 'pending', level: 8, host_level: 3, exp: 1200, host_exp: 1800, coins: 8000, diamonds: 3000, status: 'active', signature: '带你看遍世界美景', gender: 'male', address: '深圳', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20outdoor%20nature%20landscape%20mountains%20sunset%20travel%20adventure&image_size=landscape_16_9', created_at: now },
      { id: 4, username: 'user1', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138004', nickname: '快乐观众', is_host: 0, host_status: null, level: 5, host_level: 0, exp: 500, host_exp: 0, coins: 500, diamonds: 100, status: 'active', signature: '喜欢看直播', gender: 'female', address: '广州', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=happy%20social%20media%20colorful%20gradient%20abstract%20background%20pink%20orange&image_size=landscape_16_9', created_at: now },
      { id: 5, username: 'user2', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138005', nickname: '土豪哥', is_host: 0, host_status: null, level: 20, host_level: 0, exp: 15000, host_exp: 0, coins: 100000, diamonds: 50000, status: 'active', signature: '随缘打赏', gender: 'male', address: '杭州', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=luxury%20golden%20premium%20VIP%20elegant%20dark%20background%20sparkles&image_size=landscape_16_9', created_at: now },
      { id: 6, username: 'user3', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138006', nickname: '新人小白', is_host: 0, host_status: null, level: 1, host_level: 0, exp: 50, host_exp: 0, coins: 100, diamonds: 10, status: 'active', signature: '', gender: 'male', address: '成都', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20simple%20blue%20gradient%20abstract%20background%20clean&image_size=landscape_16_9', created_at: now },
      { id: 7, username: 'host4', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138007', nickname: '美食达人小雨', is_host: 1, host_status: 'approved', level: 12, host_level: 6, exp: 4500, host_exp: 6000, coins: 18000, diamonds: 8000, status: 'active', signature: '带你吃遍天下美食', gender: 'female', address: '重庆', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20food%20cooking%20warm%20orange%20yellow%20kitchen%20background&image_size=landscape_16_9', created_at: now },
      { id: 8, username: 'host5', password: '$2a$10$DF6k47r42zfn.JGEF3P2wO3R9r8NnltNufOZonUVwp/w2lA8Vy83a', phone: '13800138008', nickname: '脱口秀小王', is_host: 1, host_status: 'rejected', level: 7, host_level: 4, exp: 800, host_exp: 2500, coins: 6000, diamonds: 2500, status: 'active', signature: '每天一笑，烦恼全消', gender: 'male', address: '武汉', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=comedy%20stage%20spotlight%20purple%20theater%20background%20funny&image_size=landscape_16_9', created_at: now },
    ];

    this.tables['admins'] = [
      { id: 1, username: 'admin', password: '$2a$10$RKJqO9LlY0KI7Cwy8Cpkoel5IP2bIoSYWH662tGNaknRHgBL71.xK', created_at: now }
    ];

    this.tables['gifts'] = [
      { id: 1, name: '鲜花', icon: '🌸', price: 10, can_multiply: 1, created_at: now },
      { id: 2, name: '掌声', icon: '👏', price: 20, can_multiply: 1, created_at: now },
      { id: 3, name: '爱心', icon: '❤️', price: 50, can_multiply: 1, created_at: now },
      { id: 4, name: '火箭', icon: '🚀', price: 100, can_multiply: 1, created_at: now },
      { id: 5, name: '皇冠', icon: '👑', price: 500, can_multiply: 1, created_at: now },
      { id: 6, name: '跑车', icon: '🏎️', price: 1000, can_multiply: 1, created_at: now },
      { id: 7, name: '星星', icon: '⭐', price: 5, can_multiply: 1, created_at: now },
      { id: 8, name: '蛋糕', icon: '🎂', price: 80, can_multiply: 1, created_at: now },
      { id: 9, name: '钻石', icon: '💎', price: 200, can_multiply: 1, created_at: now },
      { id: 10, name: '飞机', icon: '✈️', price: 2000, can_multiply: 1, created_at: now },
    ];

    this.tables['categories'] = [
      { id: 1, name: '才艺', icon: '🎤', sort_order: 1, created_at: now },
      { id: 2, name: '游戏', icon: '🎮', sort_order: 2, created_at: now },
      { id: 3, name: '聊天', icon: '💬', sort_order: 3, created_at: now },
      { id: 4, name: '娱乐', icon: '🎭', sort_order: 4, created_at: now },
      { id: 5, name: '户外', icon: '🏕️', sort_order: 5, created_at: now },
      { id: 6, name: '美食', icon: '🍔', sort_order: 6, created_at: now },
      { id: 7, name: '音乐', icon: '🎵', sort_order: 7, created_at: now },
      { id: 8, name: '舞蹈', icon: '💃', sort_order: 8, created_at: now },
    ];

    this.tables['banners'] = [
      { id: 1, image_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=live%20streaming%20platform%20advertisement%20banner%20colorful%20gradient%20modern%20design%20featuring%20popular%20streamers&image_size=landscape_16_9', link: '/streams', sort_order: 1, is_active: 1, created_at: now },
      { id: 2, image_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=VIP%20membership%20promotion%20live%20stream%20golden%20premium%20banner%20exclusive%20benefits&image_size=landscape_16_9', link: '/profile', sort_order: 2, is_active: 1, created_at: now },
      { id: 3, image_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=esports%20gaming%20tournament%20live%20stream%20exciting%20competition%20banner%20neon%20style&image_size=landscape_16_9', link: '/streams?category=game', sort_order: 3, is_active: 1, created_at: now },
      { id: 4, image_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20talent%20show%20live%20music%20performance%20concert%20stage%20banner%20purple%20pink&image_size=landscape_16_9', link: '/streams?category=talent', sort_order: 4, is_active: 1, created_at: now },
      { id: 5, image_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=outdoor%20travel%20adventure%20live%20exploration%20nature%20landscape%20banner%20green%20blue&image_size=landscape_16_9', link: '/streams?category=outdoor', sort_order: 5, is_active: 1, created_at: now },
    ];

    this.tables['streams'] = [
      { id: 1, host_id: 1, room_id: '1001', title: '今晚8点演唱会，不见不散！', description: '欢迎来到我的直播间，一起听歌~', category: '才艺', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20female%20singer%20live%20concert%20stage&image_size=landscape_16_9', status: 'live', viewers_count: 520, likes_count: 1280, gifts_count: 350, start_time: now, end_time: null, is_private: 0, private_password: null, created_at: now },
      { id: 2, host_id: 2, room_id: '1002', title: '王者荣耀冲分中，目标王者！', description: '王者百星主播带你飞', category: '游戏', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=gaming%20streamer%20playing%20mobile%20game%20esports&image_size=landscape_16_9', status: 'live', viewers_count: 890, likes_count: 2100, gifts_count: 580, start_time: now, end_time: null, is_private: 0, private_password: null, created_at: now },
      { id: 3, host_id: 3, room_id: '1003', title: '云南大理自驾游，风景太美了！', description: '带你们看看大理的美景', category: '户外', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20outdoor%20landscape%20travel%20vlog&image_size=landscape_16_9', status: 'live', viewers_count: 340, likes_count: 890, gifts_count: 180, start_time: now, end_time: null, is_private: 0, private_password: null, created_at: now },
      { id: 4, host_id: 7, room_id: '1004', title: '深夜食堂，今天做红烧肉！', description: '跟着我一起学做菜', category: '美食', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20chinese%20food%20cooking%20live&image_size=landscape_16_9', status: 'ended', viewers_count: 1200, likes_count: 3500, gifts_count: 890, start_time: now, end_time: now, is_private: 0, private_password: null, created_at: now },
      { id: 5, host_id: 8, room_id: '1005', title: '脱口秀专场，爆笑不断！', description: '每天一笑，烦恼全消', category: '娱乐', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=standup%20comedy%20show%20live%20performance&image_size=landscape_16_9', status: 'offline', viewers_count: 0, likes_count: 0, gifts_count: 0, start_time: null, end_time: null, is_private: 0, private_password: null, created_at: now },
    ];

    this.tables['follows'] = [
      { id: 1, follower_id: 4, followee_id: 1, created_at: now },
      { id: 2, follower_id: 4, followee_id: 2, created_at: now },
      { id: 3, follower_id: 5, followee_id: 1, created_at: now },
      { id: 4, follower_id: 5, followee_id: 2, created_at: now },
      { id: 5, follower_id: 5, followee_id: 3, created_at: now },
      { id: 6, follower_id: 6, followee_id: 1, created_at: now },
      { id: 7, follower_id: 1, followee_id: 2, created_at: now },
      { id: 8, follower_id: 1, followee_id: 7, created_at: now },
      { id: 9, follower_id: 1, followee_id: 8, created_at: now },
    ];

    this.tables['transactions'] = [
      { id: 1, user_id: 5, type: 'recharge', amount: 100, description: '充值100美元', status: 'completed', created_at: now },
      { id: 2, user_id: 5, type: 'recharge', amount: 50, description: '充值50美元', status: 'completed', created_at: now },
      { id: 3, user_id: 1, type: 'withdraw', amount: 5000, description: '提现5000金币', status: 'pending', created_at: now },
      { id: 4, user_id: 2, type: 'withdraw', amount: 10000, description: '提现10000金币', status: 'completed', created_at: now },
      { id: 5, user_id: 4, type: 'recharge', amount: 10, description: '充值10美元', status: 'completed', created_at: now },
      { id: 6, user_id: 5, type: 'recharge', amount: 200, description: '充值200美元', status: 'completed', created_at: now },
      { id: 7, user_id: 1, type: 'withdraw', amount: 8000, description: '提现8000金币', status: 'rejected', created_at: now },
      { id: 8, user_id: 3, type: 'withdraw', amount: 3000, description: '提现3000金币', status: 'completed', created_at: now },
    ];

    this.tables['gift_records'] = [
      { id: 1, stream_id: 1, user_id: 5, gift_id: 5, count: 1, created_at: now },
      { id: 2, stream_id: 1, user_id: 5, gift_id: 4, count: 5, created_at: now },
      { id: 3, stream_id: 2, user_id: 5, gift_id: 6, count: 2, created_at: now },
      { id: 4, stream_id: 1, user_id: 4, gift_id: 3, count: 3, created_at: now },
      { id: 5, stream_id: 2, user_id: 4, gift_id: 2, count: 10, created_at: now },
      { id: 6, stream_id: 3, user_id: 5, gift_id: 9, count: 1, created_at: now },
      { id: 7, stream_id: 1, user_id: 6, gift_id: 1, count: 20, created_at: now },
    ];

    this.tables['messages'] = [
      { id: 1, stream_id: 1, user_id: 4, content: '主播唱得真好！', type: 'text', created_at: now },
      { id: 2, stream_id: 1, user_id: 5, content: '刷个火箭支持一下', type: 'text', created_at: now },
      { id: 3, stream_id: 2, user_id: 4, content: '666', type: 'text', created_at: now },
      { id: 4, stream_id: 1, user_id: 6, content: '新人报道！', type: 'text', created_at: now },
      { id: 5, stream_id: 2, user_id: 5, content: '这操作太秀了！', type: 'text', created_at: now },
      { id: 6, stream_id: 3, user_id: 4, content: '风景好美啊', type: 'text', created_at: now },
    ];

    this.tables['reports'] = [
      { id: 1, reporter_id: 4, target_type: 'user', target_id: 2, type: 'inappropriate_content', content: '发布不当言论', status: 'pending', created_at: now },
      { id: 2, reporter_id: 5, target_type: 'stream', target_id: 1, type: 'copyright_violation', content: '播放未经授权的音乐', status: 'processing', created_at: now },
      { id: 3, reporter_id: 4, target_type: 'user', target_id: 3, type: 'spam', content: '频繁发送广告信息', status: 'resolved', created_at: now },
      { id: 4, reporter_id: 6, target_type: 'message', target_id: 2, type: 'harassment', content: '恶意辱骂其他用户', status: 'pending', created_at: now },
      { id: 5, reporter_id: 5, target_type: 'stream', target_id: 2, type: 'violence', content: '直播内容包含暴力元素', status: 'resolved', created_at: now },
    ];

    this.tables['videos'] = [
      { id: 1, user_id: 1, title: '经典歌曲翻唱合集', description: '精选热门歌曲翻唱', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20female%20singer%20music%20video&image_size=portrait_16_9', duration: 180, views: 5200, likes: 1280, comments: 256, shares: 156, status: 'approved', created_at: now },
      { id: 2, user_id: 2, title: '王者荣耀操作集锦', description: '精彩操作瞬间', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mobile%20game%20esports%20highlight&image_size=portrait_16_9', duration: 120, views: 8900, likes: 2100, comments: 420, shares: 320, status: 'approved', created_at: now },
      { id: 3, user_id: 3, title: '云南大理美景vlog', description: '带你看遍大理风光', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20travel%20vlog%20landscape&image_size=portrait_16_9', duration: 300, views: 3400, likes: 890, comments: 180, shares: 95, status: 'approved', created_at: now },
      { id: 4, user_id: 7, title: '红烧肉制作教程', description: '手把手教你做红烧肉', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20food%20cooking%20tutorial&image_size=portrait_16_9', duration: 240, views: 6200, likes: 1560, comments: 320, shares: 280, status: 'approved', created_at: now },
      { id: 5, user_id: 8, title: '搞笑脱口秀精选', description: '经典段子合集', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=standup%20comedy%20funny%20show&image_size=portrait_16_9', duration: 150, views: 4500, likes: 980, comments: 210, shares: 165, status: 'approved', created_at: now },
    ];

    this.tables['notifications'] = [
      { id: 1, user_id: 4, type: 'follow', content: '用户"土豪哥"关注了你', status: 'unread', created_at: now },
      { id: 2, user_id: 1, type: 'gift', content: '用户"土豪哥"在你的直播间送了皇冠', status: 'unread', created_at: now },
      { id: 3, user_id: 4, type: 'system', content: '恭喜你获得首次登录奖励：100金币', status: 'read', created_at: now },
      { id: 4, user_id: 5, type: 'stream', content: '你关注的主播"才艺主播小美"开始直播了', status: 'unread', created_at: now },
      { id: 5, user_id: 1, type: 'transaction', content: '你的提现申请已通过，5000金币已到账', status: 'read', created_at: now },
    ];

    this.tables['blacklists'] = [
      { id: 1, user_id: 4, target_id: 2, created_at: now },
      { id: 2, user_id: 5, target_id: 3, created_at: now },
    ];

    this.tables['system_logs'] = [
      { id: 1, admin_id: 1, action: '登录系统', target: '', ip: '192.168.1.100', time: now, type: 'login' },
      { id: 2, admin_id: 1, action: '查看用户列表', target: '用户管理', ip: '192.168.1.100', time: now, type: 'view' },
      { id: 3, admin_id: 1, action: '审核通过主播', target: 'host1', ip: '192.168.1.100', time: now, type: 'approve' },
      { id: 4, admin_id: 1, action: '编辑礼物', target: '礼物ID: 1', ip: '192.168.1.100', time: now, type: 'edit' },
      { id: 5, admin_id: 1, action: '处理举报', target: '举报ID: 3', ip: '192.168.1.100', time: now, type: 'process' },
      { id: 6, admin_id: 1, action: '发布系统公告', target: '系统公告', ip: '192.168.1.100', time: now, type: 'create' },
      { id: 7, admin_id: 1, action: '审核视频', target: '视频ID: 4', ip: '192.168.1.100', time: now, type: 'review' },
      { id: 8, admin_id: 1, action: '提现审核', target: '用户ID: 2', ip: '192.168.1.100', time: now, type: 'audit' },
    ];

    this.tables['articles'] = [
      { id: 1, title: '新手入门指南', content: '欢迎来到Gala Live直播平台！这是一份新手入门指南，帮助你快速了解平台功能...', category: 'help', status: 'published', created_at: now },
      { id: 2, title: '直播规范', content: '为了维护良好的直播环境，请遵守以下直播规范：1. 不得发布违法违规内容...', category: 'help', status: 'published', created_at: now },
      { id: 3, title: '关于我们', content: 'Gala Live是一款专注于互动娱乐的直播平台，致力于为用户提供优质的直播体验...', category: 'about', status: 'published', created_at: now },
      { id: 4, title: '隐私政策', content: '我们非常重视用户隐私保护，以下是我们的隐私政策...', category: 'about', status: 'published', created_at: now },
      { id: 5, title: '常见问题解答', content: 'Q: 如何成为主播？A: 请在个人中心申请主播认证...', category: 'help', status: 'draft', created_at: now },
    ];

    this.tables['id_certifications'] = [
      { id: 1, user_id: 1, real_name: '张小美', id_card: '110101199001011234', front_photo: '/uploads/id-front-1.jpg', back_photo: '/uploads/id-back-1.jpg', hand_photo: '/uploads/id-hand-1.jpg', status: 'approved', admin_id: 1, reviewed_at: now, remark: '', created_at: now },
      { id: 2, user_id: 2, real_name: '李小杰', id_card: '310101199505055678', front_photo: '/uploads/id-front-2.jpg', back_photo: '/uploads/id-back-2.jpg', hand_photo: '/uploads/id-hand-2.jpg', status: 'approved', admin_id: 1, reviewed_at: now, remark: '', created_at: now },
      { id: 3, user_id: 3, real_name: '王小强', id_card: '440301199808089012', front_photo: '/uploads/id-front-3.jpg', back_photo: '/uploads/id-back-3.jpg', hand_photo: '/uploads/id-hand-3.jpg', status: 'pending', admin_id: null, reviewed_at: null, remark: '', created_at: now },
      { id: 4, user_id: 8, real_name: '赵小伟', id_card: '420101199212123456', front_photo: '/uploads/id-front-4.jpg', back_photo: '/uploads/id-back-4.jpg', hand_photo: '/uploads/id-hand-4.jpg', status: 'rejected', admin_id: 1, reviewed_at: now, remark: '身份证信息不清晰', created_at: now },
    ];

    this.tables['video_favorites'] = [
      { id: 1, user_id: 4, video_id: 1, created_at: now },
      { id: 2, user_id: 4, video_id: 2, created_at: now },
      { id: 3, user_id: 5, video_id: 1, created_at: now },
      { id: 4, user_id: 5, video_id: 2, created_at: now },
      { id: 5, user_id: 6, video_id: 1, created_at: now },
    ];

    this.tables['level_configs'] = [
      { id: 1, type: 'user', level: 1, min_exp: 0, max_exp: 100, name: 'LV.1 新手', icon: '🌱', color: '#9ca3af', benefits: '基础功能权限', created_at: now },
      { id: 2, type: 'user', level: 2, min_exp: 100, max_exp: 300, name: 'LV.2 普通', icon: '⭐', color: '#60a5fa', benefits: '解锁高级弹幕', created_at: now },
      { id: 3, type: 'user', level: 3, min_exp: 300, max_exp: 600, name: 'LV.3 活跃', icon: '🌟', color: '#34d399', benefits: '专属头像框', created_at: now },
      { id: 4, type: 'user', level: 4, min_exp: 600, max_exp: 1000, name: 'LV.4 达人', icon: '💫', color: '#a78bfa', benefits: '直播间优先进入', created_at: now },
      { id: 5, type: 'user', level: 5, min_exp: 1000, max_exp: 1500, name: 'LV.5 精英', icon: '💎', color: '#fbbf24', benefits: '免费礼物领取', created_at: now },
      { id: 6, type: 'user', level: 6, min_exp: 1500, max_exp: 2500, name: 'LV.6 大师', icon: '👑', color: '#f87171', benefits: '专属客服', created_at: now },
      { id: 7, type: 'user', level: 7, min_exp: 2500, max_exp: 4000, name: 'LV.7 王者', icon: '🏆', color: '#ec4899', benefits: '全站排名展示', created_at: now },
      { id: 8, type: 'user', level: 8, min_exp: 4000, max_exp: 6000, name: 'LV.8 传奇', icon: '🔥', color: '#22d3ee', benefits: '自定义房间', created_at: now },
      { id: 9, type: 'user', level: 9, min_exp: 6000, max_exp: 10000, name: 'LV.9 至尊', icon: '⚡', color: '#8b5cf6', benefits: '专属徽章', created_at: now },
      { id: 10, type: 'user', level: 10, min_exp: 10000, max_exp: 9999999, name: 'LV.10 VIP', icon: '💠', color: '#f59e0b', benefits: '全部特权', created_at: now },
      { id: 11, type: 'host', level: 1, min_exp: 0, max_exp: 500, name: 'LV.1 新手主播', icon: '🎤', color: '#9ca3af', benefits: '基础直播权限', created_at: now },
      { id: 12, type: 'host', level: 2, min_exp: 500, max_exp: 1500, name: 'LV.2 普通主播', icon: '🎵', color: '#a78bfa', benefits: '礼物分成50%', created_at: now },
      { id: 13, type: 'host', level: 3, min_exp: 1500, max_exp: 3500, name: 'LV.3 人气主播', icon: '🎶', color: '#ec4899', benefits: '礼物分成55%', created_at: now },
      { id: 14, type: 'host', level: 4, min_exp: 3500, max_exp: 6500, name: 'LV.4 明星主播', icon: '⭐', color: '#fbbf24', benefits: '礼物分成60%', created_at: now },
      { id: 15, type: 'host', level: 5, min_exp: 6500, max_exp: 10000, name: 'LV.5 金牌主播', icon: '🌟', color: '#34d399', benefits: '礼物分成65%', created_at: now },
      { id: 16, type: 'host', level: 6, min_exp: 10000, max_exp: 15000, name: 'LV.6 钻石主播', icon: '💎', color: '#22d3ee', benefits: '礼物分成70%', created_at: now },
      { id: 17, type: 'host', level: 7, min_exp: 15000, max_exp: 25000, name: 'LV.7 皇冠主播', icon: '👑', color: '#8b5cf6', benefits: '礼物分成75%', created_at: now },
      { id: 18, type: 'host', level: 8, min_exp: 25000, max_exp: 40000, name: 'LV.8 殿堂主播', icon: '🏆', color: '#f87171', benefits: '礼物分成80%', created_at: now },
      { id: 19, type: 'host', level: 9, min_exp: 40000, max_exp: 60000, name: 'LV.9 传奇主播', icon: '🔥', color: '#f59e0b', benefits: '专属推荐位', created_at: now },
      { id: 20, type: 'host', level: 10, min_exp: 60000, max_exp: 9999999, name: 'LV.10 至尊主播', icon: '⚡', color: '#d946ef', benefits: '全部特权', created_at: now },
    ];

    this.tables['configs'] = [
      { id: 1, key: 'defaultCoins', value: '100', description: '新用户初始金币', created_at: now },
      { id: 2, key: 'defaultDiamonds', value: '0', description: '新用户初始钻石', created_at: now },
    ];

    this.autoIncrement = {
      users: 9,
      streams: 6,
      stream_viewers: 1,
      gifts: 11,
      gift_records: 8,
      messages: 7,
      follows: 9,
      video_favorites: 6,
      transactions: 9,
      banners: 5,
      categories: 9,
      admins: 2,
      reports: 6,
      videos: 6,
      notifications: 6,
      blacklists: 3,
      system_logs: 9,
      articles: 6,
      id_certifications: 5,
      level_configs: 21,
      configs: 3,
    };

    this.save();
    console.log('Database initialized with sample data');
  }
}

class PreparedStatement {
  constructor(sql, db) {
    this.sql = sql.trim();
    this.db = db;
  }

  evaluateExpression(expr, row, key) {
    expr = expr.trim();
    console.log('[DEBUG] evaluateExpression:', expr, 'row[key]:', row[key]);
    
    const maxMatch = expr.match(/^MAX\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (maxMatch) {
      console.log('[DEBUG] MAX match:', maxMatch[1], maxMatch[2]);
      const val1 = this.evaluateSimpleExpression(maxMatch[1], row, key);
      const val2 = this.evaluateSimpleExpression(maxMatch[2], row, key);
      console.log('[DEBUG] MAX values:', val1, val2);
      return Math.max(val1, val2);
    }
    
    const minMatch = expr.match(/^MIN\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (minMatch) {
      const val1 = this.evaluateSimpleExpression(minMatch[1], row, key);
      const val2 = this.evaluateSimpleExpression(minMatch[2], row, key);
      return Math.min(val1, val2);
    }
    
    return this.evaluateSimpleExpression(expr, row, key);
  }

  evaluateSimpleExpression(expr, row, key) {
    expr = expr.trim();
    
    const colMatch = expr.match(/^([a-zA-Z_]\w*)\s*([+\-*/])\s*(\d+)$/);
    if (colMatch) {
      const colName = colMatch[1];
      const op = colMatch[2];
      const num = parseInt(colMatch[3]);
      const val = row[colName] !== undefined ? row[colName] : (colName === key ? 0 : 0);
      
      switch (op) {
        case '+': return val + num;
        case '-': return val - num;
        case '*': return val * num;
        case '/': return val / num;
        default: return val;
      }
    }
    
    const numMatch = expr.match(/^\d+$/);
    if (numMatch) {
      return parseInt(expr);
    }
    
    if (row[expr] !== undefined) {
      return row[expr];
    }
    
    return row[key] || 0;
  }

  parseSQL() {
    const sql = this.sql;
    let tableName = '';
    let action = '';
    let columns = [];
    let values = [];
    let whereClause = [];
    let orderBy = '';
    let limit = null;
    let offset = null;
    let joinTable = null;
    let joinOn = null;
    let aggregates = [];

    if (sql.startsWith('INSERT')) {
      action = 'INSERT';
      const match = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        tableName = match[1];
        columns = match[2].split(',').map(c => c.trim());
        const placeholders = match[3].split(',').map(p => p.trim());
        values = placeholders.map(p => p === '?' ? null : p.replace(/['"]/g, ''));
      }
    } else if (sql.startsWith('UPDATE')) {
      action = 'UPDATE';
      const match = sql.match(/UPDATE (\w+)\s*SET\s*([\s\S]*?)(?:WHERE\s*(.+))?$/i);
      if (match) {
        tableName = match[1];
        const setParts = [];
        let currentPart = '';
        let parenCount = 0;
        for (let i = 0; i < match[2].length; i++) {
          const char = match[2][i];
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (char === ',' && parenCount === 0) {
            setParts.push(currentPart.trim());
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        if (currentPart.trim()) {
          setParts.push(currentPart.trim());
        }
        setParts.forEach(part => {
          const eqIdx = part.indexOf('=');
          const key = part.substring(0, eqIdx).trim();
          const value = part.substring(eqIdx + 1).trim();
          if (value === '?') {
            columns.push({ key, value: null });
          } else if (value.includes('?') || value.includes('(') || value.toUpperCase().includes('MAX') || value.toUpperCase().includes('MIN') || value.toUpperCase().includes('SUM') || value.toUpperCase().includes('COUNT') || value.match(/[a-zA-Z_]\w*\s*[+\-*/]/)) {
            columns.push({ key, value, isExpression: true });
          } else {
            columns.push({ key, value: value.replace(/['"]/g, '') });
          }
        });
        if (match[3]) {
          whereClause = match[3].split('AND').map(w => w.trim());
        }
      }
    } else if (sql.startsWith('DELETE')) {
      action = 'DELETE';
      const match = sql.match(/DELETE FROM (\w+)\s*(?:WHERE\s*(.+))?/i);
      if (match) {
        tableName = match[1];
        if (match[2]) {
          whereClause = match[2].split('AND').map(w => w.trim());
        }
      }
    } else if (sql.startsWith('SELECT')) {
      action = 'SELECT';
      let remaining = sql;
      
      const selectMatch = remaining.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
      if (!selectMatch) return { action: 'SELECT', tableName: '', columns: [], whereClause: [], orderBy: '', limit: null, offset: null };
      
      columns = selectMatch[1].split(',').map(c => c.trim());
      columns.forEach(col => {
        if (col.toUpperCase().startsWith('COUNT(') || col.toUpperCase().startsWith('SUM(')) {
          const match = col.match(/(COUNT|SUM)\s*\(\s*([^*]+?|\*)\s*\)\s*(?:AS\s+(\w+))?/i);
          if (match) {
            aggregates.push({
              func: match[1].toUpperCase(),
              column: match[2].trim(),
              alias: match[3] || `${match[1].toLowerCase()}_${match[2].trim()}`
            });
          }
        }
      });

      tableName = selectMatch[2];
      
      remaining = remaining.substring(selectMatch[0].length);
      
      const joinMatch = remaining.match(/\s*\w*\s*(LEFT\s+)?JOIN\s+(\w+)(?:\s+\w+)?\s*ON\s+(.+?)(?=\s+(?:WHERE|ORDER BY|LIMIT|OFFSET|$))/i);
      if (joinMatch) {
        joinTable = joinMatch[2];
        joinOn = joinMatch[3];
        remaining = remaining.substring(joinMatch[0].length);
      }
      
      const whereMatch = remaining.match(/\s+WHERE\s+(.+?)(?=\s+(?:ORDER BY|LIMIT|OFFSET)|$)/i);
      if (whereMatch) {
        whereClause = whereMatch[1].split('AND').map(w => w.trim());
        remaining = remaining.substring(whereMatch[0].length);
      }
      
      const orderMatch = remaining.match(/\s+ORDER BY\s+(.+?)(?=\s+(?:LIMIT|OFFSET|$))/i);
      if (orderMatch) {
        orderBy = orderMatch[1];
        remaining = remaining.substring(orderMatch[0].length);
      }
      
      const limitMatch = remaining.match(/\s+LIMIT\s+(\d+)/i);
      if (limitMatch) {
        limit = parseInt(limitMatch[1]);
      }
      
      const offsetMatch = remaining.match(/\s+OFFSET\s+(\d+)/i);
      if (offsetMatch) {
        offset = parseInt(offsetMatch[1]);
      }
    }

    return { action, tableName, columns, values, whereClause, orderBy, limit, offset, joinTable, joinOn, aggregates };
  }

  run(...params) {
    const parsed = this.parseSQL();
    let paramIndex = 0;

    if (parsed.action === 'INSERT') {
      const row = {};
      parsed.columns.forEach((col, idx) => {
        row[col] = parsed.values[idx] === null ? params[paramIndex++] : parsed.values[idx];
      });
      
      if (!row.id) {
        row.id = this.db.autoIncrement[parsed.tableName]++;
      }
      
      this.db.tables[parsed.tableName].push(row);
      this.db.save();
      return { lastInsertRowid: row.id, changes: 1 };
    } else if (parsed.action === 'UPDATE') {
      let changes = 0;
      let paramIdx = paramIndex;
      
      const setParamCount = parsed.columns.filter(col => col.value === null || (col.isExpression && col.value.includes('?'))).length;
      
      this.db.tables[parsed.tableName].forEach(row => {
        const whereIdx = paramIdx + setParamCount;
        const { match } = this.matchWhere(row, parsed.whereClause, params, whereIdx);
        if (match) {
          let idx = paramIdx;
          parsed.columns.forEach(col => {
            if (col.value === null) {
              row[col.key] = params[idx++];
            } else if (col.isExpression) {
              const expr = col.value.replace(/\?/g, () => params[idx++]);
              row[col.key] = this.evaluateExpression(expr, row, col.key);
            } else {
              row[col.key] = col.value;
            }
          });
          changes++;
        }
      });
      this.db.save();
      return { changes };
    } else if (parsed.action === 'DELETE') {
      const initialLength = this.db.tables[parsed.tableName].length;
      const filtered = [];
      for (let i = 0; i < this.db.tables[parsed.tableName].length; i++) {
        const row = this.db.tables[parsed.tableName][i];
        const { match } = this.matchWhere(row, parsed.whereClause, params, paramIndex);
        if (!match) {
          filtered.push(row);
        }
      }
      this.db.tables[parsed.tableName] = filtered;
      this.db.save();
      return { changes: initialLength - this.db.tables[parsed.tableName].length };
    }

    return { changes: 0 };
  }

  all(...params) {
    const parsed = this.parseSQL();
    if (parsed.action !== 'SELECT') return [];

    if (parsed.aggregates.length > 0) {
      const result = {};
      let rows = [...this.db.tables[parsed.tableName] || []];
      
      let paramIndex = 0;
      if (parsed.whereClause.length > 0) {
        rows = rows.filter(row => {
          const { match } = this.matchWhere(row, parsed.whereClause, params, paramIndex);
          return match;
        });
      }

      parsed.aggregates.forEach(agg => {
        if (agg.func === 'COUNT') {
          result[agg.alias] = rows.length;
        } else if (agg.func === 'SUM') {
          result[agg.alias] = rows.reduce((sum, row) => sum + (parseFloat(row[agg.column]) || 0), 0);
        }
      });

      return [result];
    }

    let results = [...this.db.tables[parsed.tableName] || []];
    
    if (parsed.joinTable) {
      const joinData = this.db.tables[parsed.joinTable] || [];
      const joinParts = parsed.joinOn.split('=').map(p => p.trim());
      const [leftCol, rightCol] = [joinParts[0].split('.')[1] || joinParts[0], joinParts[1].split('.')[1] || joinParts[1]];
      
      results = results.map(mainRow => {
        const joinRow = joinData.find(r => parseInt(r[rightCol]) === parseInt(mainRow[leftCol]));
        if (joinRow) {
          const merged = { ...mainRow };
          for (const key of Object.keys(joinRow)) {
            if (key !== rightCol && !(key in mainRow)) {
              merged[key] = joinRow[key];
            }
          }
          return merged;
        }
        return mainRow;
      }).filter(r => r !== null);
    }

    if (parsed.whereClause.length > 0) {
      let paramIndex = 0;
      results = results.filter(row => {
        const { match } = this.matchWhere(row, parsed.whereClause, params, paramIndex);
        return match;
      });
    }

    if (parsed.orderBy) {
      const [col, dir] = parsed.orderBy.split(' ');
      const sortCol = col.split('.')[1] || col;
      results.sort((a, b) => {
        const valA = a[sortCol] || 0;
        const valB = b[sortCol] || 0;
        if (dir && dir.toUpperCase() === 'DESC') {
          return valB > valA ? 1 : -1;
        }
        return valA > valB ? 1 : -1;
      });
    }

    if (parsed.offset) {
      results = results.slice(parsed.offset);
    }
    if (parsed.limit) {
      results = results.slice(0, parsed.limit);
    }

    return results.map(row => {
      const newRow = {};
      parsed.columns.forEach(col => {
        if (col.toUpperCase().startsWith('COUNT(') || col.toUpperCase().startsWith('SUM(')) {
          return;
        }
        if (col.includes('*')) {
          for (const key of Object.keys(row)) {
            newRow[key] = row[key];
          }
        } else if (col.includes('AS')) {
          const [original, alias] = col.split('AS').map(c => c.trim());
          const actualCol = original.split('.')[1] || original;
          newRow[alias] = row[actualCol] !== undefined ? row[actualCol] : 0;
        } else {
          const actualCol = col.split('.')[1] || col;
          newRow[actualCol] = row[actualCol] !== undefined ? row[actualCol] : '';
        }
      });
      return newRow;
    });
  }

  get(...params) {
    const results = this.all(...params);
    return results.length > 0 ? results[0] : null;
  }

  matchWhere(row, whereClause, params, paramIndex) {
    let match = true;
    let idx = paramIndex;
    
    whereClause.forEach(clause => {
      clause = clause.trim();
      if (!clause) return;
      
      let op = '=';
      let parts;
      
      if (clause.includes('LIKE')) {
        parts = clause.split('LIKE');
        op = 'LIKE';
      } else if (clause.includes('IN')) {
        parts = clause.split('IN');
        op = 'IN';
      } else if (clause.includes('!=')) {
        parts = clause.split('!=');
        op = '!=';
      } else {
        parts = clause.split('=');
      }
      
      if (parts.length < 2) return;
      
      const field = parts[0].trim().split('.')[1] || parts[0].trim();
      const value = parts[1].trim();
      
      let compareValue;
      if (op === 'IN') {
        const placeholderMatch = value.match(/\(\s*(.+?)\s*\)/);
        if (placeholderMatch) {
          const placeholders = placeholderMatch[1].split(',').map(p => p.trim()).filter(p => p === '?');
          compareValue = placeholders.map(() => params[idx++]);
        } else {
          compareValue = [];
        }
      } else if (value === '?') {
        compareValue = params[idx++];
      } else {
        compareValue = value.replace(/['"]/g, '');
      }
      
      const rowValue = row[field] !== undefined ? row[field] : '';
      
      if (op === 'LIKE') {
        const pattern = compareValue.replace(/%/g, '.*');
        match = match && new RegExp(pattern, 'i').test(String(rowValue));
      } else if (op === 'IN') {
        match = match && compareValue.some(v => String(rowValue) === String(v));
      } else if (op === '!=') {
        match = match && String(rowValue) !== String(compareValue);
      } else {
        match = match && String(rowValue) === String(compareValue);
      }
    });
    
    return { match, idx };
  }
}

const db = new FileDatabase();

const initDatabase = () => {
  db.load();
};

const getDB = () => {
  return db;
};

module.exports = { initDatabase, getDB };