import { useState, useEffect, useRef, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { TonConnectButton } from '@tonconnect/ui-react';
import { 
  Coins, 
  Zap, 
  Users, 
  Wand2, 
  Wallet,
  ArrowUpCircle,
  ShieldCheck,
  CloudUpload,
  AlertCircle
} from 'lucide-react';
import mascotImg from './assets/badger-mascot.png';
import warriorImg from './assets/badger-warrior.png';
import generalImg from './assets/badger-general.png';
import emperorImg from './assets/badger-emperor.png';
import { supabase } from './supabase';
import './App.css';

interface ClickAnimation {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
}

function App() {
  // User Identification
  const tgUser = WebApp.initDataUnsafe?.user;
  const userId = tgUser?.id || 'guest_user';

  // Game State
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(1000);
  const [maxEnergy, setMaxEnergy] = useState(1000);
  const [activeTab, setActiveTab] = useState('earn');
  const [clicks, setClicks] = useState<ClickAnimation[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Upgrades State
  const [multiTapLevel, setMultiTapLevel] = useState(1);
  const [energyLimitLevel, setEnergyLimitLevel] = useState(1);
  const [rechargeSpeedLevel, setRechargeSpeedLevel] = useState(1);
  const [badgerBotLevel, setBadgerBotLevel] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  
  // Refs
  const nextId = useRef(0);
  const lastSavedState = useRef({ balance, multiTapLevel, energyLimitLevel, rechargeSpeedLevel, badgerBotLevel });

  // Persistence: Fetch Data
  useEffect(() => {
    async function loadData() {
      if (!supabase) return;
      
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('telegram_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setBalance(data.balance);
          setMultiTapLevel(data.multitap_level);
          setEnergyLimitLevel(data.energy_limit_level);
          setRechargeSpeedLevel(data.recharge_speed_level);
          setBadgerBotLevel(data.badger_bot_level);
          setMaxEnergy(1000 + (data.energy_limit_level - 1) * 500);
          setCompletedTasks(data.completed_tasks || []);
          setLastCheckIn(data.last_check_in || null);
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError('Persistence offline');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [userId]);

  // Persistence: Save Data
  const saveData = useCallback(async () => {
    if (!supabase || isLoading) return;
    
    // Only save if data changed
    const currentState = { balance, multiTapLevel, energyLimitLevel, rechargeSpeedLevel, badgerBotLevel };
    if (JSON.stringify(currentState) === JSON.stringify(lastSavedState.current)) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .upsert({
          telegram_id: userId,
          username: tgUser?.username || 'unknown',
          first_name: tgUser?.first_name || 'Badger',
          balance: balance,
          multitap_level: multiTapLevel,
          energy_limit_level: energyLimitLevel,
          recharge_speed_level: rechargeSpeedLevel,
          badger_bot_level: badgerBotLevel,
          completed_tasks: completedTasks,
          last_check_in: lastCheckIn,
          last_active: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

      if (error) throw error;
      lastSavedState.current = currentState;
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [balance, multiTapLevel, energyLimitLevel, rechargeSpeedLevel, badgerBotLevel, userId, tgUser, isLoading]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('players')
        .select('username, first_name, balance')
        .order('balance', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      if (data) setTopPlayers(data);
    } catch (err) {
      console.error('Leaderboard fetch failed:', err);
    }
  }, []);

  // Auto-save every 15 seconds
  useEffect(() => {
    const interval = setInterval(saveData, 15000);
    return () => clearInterval(interval);
  }, [saveData]);

  // Initial leaderboard fetch
  useEffect(() => {
    if (activeTab === 'friends') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  // Energy & Passive Income
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prev) => Math.min(prev + (rechargeSpeedLevel), maxEnergy));
      if (badgerBotLevel > 0) {
        setBalance(prev => prev + (badgerBotLevel * 2));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [maxEnergy, rechargeSpeedLevel, badgerBotLevel]);

  const handleMascotClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (energy < multiTapLevel) {
      WebApp.HapticFeedback.notificationOccurred('error');
      return;
    }

    const now = Date.now();
    const isCombo = now - lastClickTime < 300;
    const newCombo = isCombo ? Math.min(combo + 1, 50) : 0;
    
    setCombo(newCombo);
    setLastClickTime(now);

    // Dynamic Haptics based on combo
    if (newCombo % 10 === 0 && newCombo > 0) {
      WebApp.HapticFeedback.notificationOccurred('success');
    } else {
      WebApp.HapticFeedback.impactOccurred(newCombo > 20 ? 'heavy' : 'medium');
    }

    // Tilt effect calculation
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = ((clientX - rect.left) / rect.width - 0.5) * 30;
    const y = ((clientY - rect.top) / rect.height - 0.5) * -30;
    setTilt({ x, y });
    setTimeout(() => setTilt({ x: 0, y: 0 }), 100);

    const reward = multiTapLevel * (1 + Math.floor(newCombo / 10) * 0.5);
    setBalance(prev => prev + reward);
    setEnergy(prev => Math.max(0, prev - multiTapLevel));

    // Add floating number
    const newClick = { id: nextId.current++, x: clientX, y: clientY };
    setClicks(prev => [...prev, newClick]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== newClick.id)), 800);

    // Add particles
    const particleCount = 6 + Math.floor(newCombo / 5);
    const newParticles: Particle[] = Array.from({ length: particleCount }).map((_, i) => ({
      id: nextId.current++,
      x: clientX,
      y: clientY,
      tx: (Math.random() - 0.5) * (200 + newCombo * 2),
      ty: (Math.random() - 0.5) * (200 + newCombo * 2)
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id))), 600);
  };

  const getLevelInfo = () => {
    if (balance < 10000) return { name: 'Badger Cub', img: mascotImg, next: 10000, current: 0 };
    if (balance < 50000) return { name: 'Sett Forager', img: warriorImg, next: 50000, current: 10000 };
    if (balance < 250000) return { name: 'Honey Warrior', img: generalImg, next: 250000, current: 50000 };
    return { name: 'Sett Boss', img: emperorImg, next: 1000000, current: 250000 };
  };

  const levelInfo = getLevelInfo();
  const xpProgress = ((balance - levelInfo.current) / (levelInfo.next - levelInfo.current)) * 100;

  const calculateCost = (base: number, level: number) => Math.floor(base * Math.pow(1.6, level - 1));

  const buyUpgrade = (id: string) => {
    let cost = 0;
    switch(id) {
      case 'multitap':
        cost = calculateCost(100, multiTapLevel);
        if (balance >= cost) {
          setBalance(prev => prev - cost);
          setMultiTapLevel(prev => prev + 1);
        }
        break;
      case 'energy':
        cost = calculateCost(150, energyLimitLevel);
        if (balance >= cost) {
          setBalance(prev => prev - cost);
          setEnergyLimitLevel(prev => prev + 1);
          setMaxEnergy(prev => prev + 500);
        }
        break;
      case 'recharge':
        cost = calculateCost(250, rechargeSpeedLevel);
        if (balance >= cost) {
          setBalance(prev => prev - cost);
          setRechargeSpeedLevel(prev => prev + 1);
        }
        break;
      case 'bot':
        cost = calculateCost(2000, badgerBotLevel + 1);
        if (balance >= cost) {
          setBalance(prev => prev - cost);
          setBadgerBotLevel(prev => prev + 1);
        }
        break;
    }
    WebApp.HapticFeedback.notificationOccurred('success');
  };

  const completeTask = (taskId: string, reward: number) => {
    if (completedTasks.includes(taskId)) return;
    
    // Simulate task (open link)
    if (taskId === 'x_follow') WebApp.openLink('https://x.com/BadgerAI');
    if (taskId === 'tg_channel') WebApp.openTelegramLink('https://t.me/BadgerChannel');
    
    setBalance(prev => prev + reward);
    setCompletedTasks(prev => [...prev, taskId]);
    WebApp.HapticFeedback.notificationOccurred('success');
    WebApp.showAlert(`Task Complete! You earned ${reward.toLocaleString()} coins.`);
  };

  const dailyCheckIn = () => {
    const today = new Date().toISOString().split('T')[0];
    if (lastCheckIn === today) {
      WebApp.showAlert('You already checked in today! Come back tomorrow.');
      return;
    }
    
    const reward = 5000; // Simplified daily reward
    setBalance(prev => prev + reward);
    setLastCheckIn(today);
    WebApp.HapticFeedback.notificationOccurred('success');
    WebApp.showAlert(`Daily Reward! You earned ${reward.toLocaleString()} coins.`);
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glow-effect" style={{ width: '100px', height: '100px' }}></div>
        <img src={mascotImg} alt="Loading..." style={{ width: '150px', animation: 'pulse 1.5s infinite' }} />
        <h2 style={{ marginTop: '20px', color: 'var(--accent-gold)' }}>Loading Sett...</h2>
      </div>
    );
  }

  const getBgColor = () => {
    if (combo > 30) return 'radial-gradient(circle at center, #2d1b09 0%, #050a05 100%)';
    if (combo > 15) return 'radial-gradient(circle at center, #1a2f18 0%, #050a05 100%)';
    return 'radial-gradient(circle at top right, var(--bg-secondary) 0%, var(--bg-primary) 100%)';
  };

  return (
    <div className="app-container" style={{ background: getBgColor() }}>
      <header className="header">
        <div className="user-profile">
          <div className="avatar">{tgUser?.first_name?.charAt(0) || 'B'}</div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{tgUser?.first_name || 'Badger Boss'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="var(--accent-gold)" />
              {levelInfo.name}
            </div>
          </div>
        </div>
        <div className="level-badge">LVL {Math.floor(balance / 50000) + 1}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSaving && <CloudUpload size={18} className="saving-icon" color="var(--accent-gold)" />}
          {error && <AlertCircle size={18} color="#FF5252" />}
          <TonConnectButton />
        </div>
      </header>

      <section className="stats-container">
        <div className="token-balance">
          <Coins size={40} />
          {balance.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '15px' }}>
          <span>+{multiTapLevel} / click</span>
          {badgerBotLevel > 0 && <span style={{ color: 'var(--accent-gold)' }}>+{badgerBotLevel * 2} / sec</span>}
        </div>
        <div style={{ width: '100%', marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span>Progress to Next Rank</span>
            <span>{Math.min(100, xpProgress).toFixed(0)}%</span>
          </div>
          <div className="energy-bar-bg" style={{ height: '6px' }}>
            <div className="energy-bar-fill" style={{ width: `${Math.min(100, xpProgress)}%`, background: 'var(--accent-gold)' }}></div>
          </div>
        </div>
      </section>

      <div className="tab-content">
        {activeTab === 'earn' && (
          <main className="clicker-section">
            <div 
              className={`mascot-container ${combo > 20 ? 'super-charge' : ''}`} 
              onClick={handleMascotClick}
              style={{ transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(${tilt.x !== 0 ? 0.95 : 1})` }}
            >
              <div className="glow-effect"></div>
              {combo > 10 && (
                <div className="combo-badge">
                  {combo}x COMBO
                </div>
              )}
              <img src={levelInfo.img} alt="Badger Mascot" className="mascot-img" />
            </div>

            {clicks.map(click => (
              <div key={click.id} className="floating-number" style={{ left: click.x - 20, top: click.y - 40 }}>
                +{multiTapLevel}
              </div>
            ))}

            {particles.map(p => (
              <div 
                key={p.id} 
                className="particle" 
                style={{ 
                  left: p.x, 
                  top: p.y, 
                  '--tx': `${p.tx}px`, 
                  '--ty': `${p.ty}px` 
                } as any}
              />
            ))}

            <div className="tasks-preview" style={{ marginTop: '30px', width: '100%' }}>
              <h3 className="brand-font" style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Daily Bounty</h3>
              <div className="task-card" onClick={dailyCheckIn} style={{ opacity: lastCheckIn === new Date().toISOString().split('T')[0] ? 0.6 : 1 }}>
                <div className="task-icon">📅</div>
                <div className="task-info">
                  <div className="task-name">Daily Check-in</div>
                  <div className="task-reward">+5,000</div>
                </div>
                <button className="task-action-btn" disabled={lastCheckIn === new Date().toISOString().split('T')[0]}>
                  {lastCheckIn === new Date().toISOString().split('T')[0] ? 'Claimed' : 'Claim'}
                </button>
              </div>

              <h3 className="brand-font" style={{ fontSize: '1.2rem', margin: '25px 0 15px 0' }}>Social Missions</h3>
              <div className="task-card" onClick={() => completeTask('tg_channel', 10000)}>
                <div className="task-icon">📢</div>
                <div className="task-info">
                  <div className="task-name">Join Badger Channel</div>
                  <div className="task-reward">+10,000</div>
                </div>
                <button className="task-action-btn" disabled={completedTasks.includes('tg_channel')}>
                  {completedTasks.includes('tg_channel') ? 'Done' : 'Join'}
                </button>
              </div>
              
              <div className="task-card" onClick={() => completeTask('x_follow', 10000)}>
                <div className="task-icon">𝕏</div>
                <div className="task-info">
                  <div className="task-name">Follow Badger on X</div>
                  <div className="task-reward">+10,000</div>
                </div>
                <button className="task-action-btn" disabled={completedTasks.includes('x_follow')}>
                  {completedTasks.includes('x_follow') ? 'Done' : 'Follow'}
                </button>
              </div>
            </div>
          </main>
        )}

        {activeTab === 'boosts' && (
          <div className="store-container">
            <h2 className="brand-font" style={{ marginBottom: '15px', fontSize: '1.5rem' }}>Badger Forge</h2>
            
            <div className="upgrade-card">
              <div className="upgrade-info">
                <div className="upgrade-name">Sharp Claws</div>
                <div className="upgrade-desc">Level {multiTapLevel} • Increase tap power</div>
                <div className="upgrade-cost">
                  <Coins size={14} /> {calculateCost(100, multiTapLevel).toLocaleString()}
                </div>
              </div>
              <button className="upgrade-button" onClick={() => buyUpgrade('multitap')} disabled={balance < calculateCost(100, multiTapLevel)}>
                Upgrade
              </button>
            </div>

            <div className="upgrade-card">
              <div className="upgrade-info">
                <div className="upgrade-name">Thick Hide</div>
                <div className="upgrade-desc">Level {energyLimitLevel} • +500 Max Energy</div>
                <div className="upgrade-cost">
                  <Coins size={14} /> {calculateCost(150, energyLimitLevel).toLocaleString()}
                </div>
              </div>
              <button className="upgrade-button" onClick={() => buyUpgrade('energy')} disabled={balance < calculateCost(150, energyLimitLevel)}>
                Upgrade
              </button>
            </div>

            <div className="upgrade-card">
              <div className="upgrade-info">
                <div className="upgrade-name">Honey Rush</div>
                <div className="upgrade-desc">Level {rechargeSpeedLevel} • Faster recovery</div>
                <div className="upgrade-cost">
                  <Coins size={14} /> {calculateCost(250, rechargeSpeedLevel).toLocaleString()}
                </div>
              </div>
              <button className="upgrade-button" onClick={() => buyUpgrade('recharge')} disabled={balance < calculateCost(250, rechargeSpeedLevel)}>
                Upgrade
              </button>
            </div>

            <h2 className="brand-font" style={{ margin: '25px 0 15px 0', fontSize: '1.5rem' }}>Secret Operations</h2>

            <div className="upgrade-card">
              <div className="upgrade-info">
                <div className="upgrade-name">Badger Bot v1</div>
                <div className="upgrade-desc">Level {badgerBotLevel} • Passive harvesting</div>
                <div className="upgrade-cost">
                  <Coins size={14} /> {calculateCost(2000, badgerBotLevel + 1).toLocaleString()}
                </div>
              </div>
              <button className="upgrade-button" onClick={() => buyUpgrade('bot')} disabled={balance < calculateCost(2000, badgerBotLevel + 1)}>
                {badgerBotLevel === 0 ? 'Recruit' : 'Upgrade'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="leaderboard-container">
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <Users size={48} style={{ color: 'var(--accent-gold)', marginBottom: '10px' }} />
              <h2 className="brand-font">The Sett Leaderboard</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Top 20 Badgers in the ecosystem</p>
            </div>

            <div className="leaderboard-list">
              {topPlayers.length > 0 ? (
                topPlayers.map((player, index) => (
                  <div key={index} className={`leaderboard-item ${index < 3 ? 'top-rank' : ''}`}>
                    <div className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                    <div className="player-info">
                      <div className="player-name">{player.first_name || player.username}</div>
                      <div className="player-subtext">Badger Warrior</div>
                    </div>
                    <div className="player-score">
                      <Coins size={14} /> {player.balance.toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Gathering intelligence...</div>
              )}
            </div>

            <div className="invite-section" style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Grow Your Sett</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Invite friends and earn 10% of their future token rewards!
              </p>
              <button 
                className="upgrade-button" 
                style={{ width: '100%' }}
                onClick={() => {
                  const refLink = `https://t.me/BadgerReborn_Bot/app?startapp=ref_${userId}`;
                  WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join me in Badger Clicker and let\'s take over the TON blockchain! 🦡💰')}`);
                }}
              >
                Share Invite Link
              </button>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="vault-container">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Wallet size={64} style={{ color: 'var(--accent-gold)', marginBottom: '20px' }} />
              <h2 className="brand-font">The Badger Vault</h2>
            </div>

            <div className="token-preview-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>In-game Balance</span>
                <span style={{ fontWeight: 'bold' }}>{balance.toLocaleString()} $BADGER</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estimated Value</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>~{(balance / 1000000).toFixed(4)} TON</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '10px' }}>
                * Conversion rate is based on the current algorithmic liquidity pool estimate.
              </p>
            </div>

            <div className="roadmap-section" style={{ marginTop: '30px' }}>
              <h3 className="brand-font" style={{ fontSize: '1.2rem', marginBottom: '15px' }}>$BADGER Roadmap</h3>
              <div className="roadmap-step completed">
                <div className="step-check">✓</div>
                <div className="step-info">
                  <div className="step-title">Phase 1: Recruitment</div>
                  <div className="step-desc">Launch Badger Clicker & Grow the Sett</div>
                </div>
              </div>
              <div className="roadmap-step active">
                <div className="step-check">2</div>
                <div className="step-info">
                  <div className="step-title">Phase 2: Minting</div>
                  <div className="step-desc">Deploy $BADGER Jetton on TON Blockchain</div>
                </div>
              </div>
              <div className="roadmap-step">
                <div className="step-check">3</div>
                <div className="step-info">
                  <div className="step-title">Phase 3: Exchange</div>
                  <div className="step-desc">List $BADGER on DEXs & Enable Withdrawals</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
              <TonConnectButton />
            </div>
          </div>
        )}
      </div>

      <section className="energy-container">
        <div className="energy-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={16} color="var(--accent-gold)" fill="var(--accent-gold)" />
            <span style={{ fontWeight: 'bold' }}>{energy} / {maxEnergy}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Energy</div>
        </div>
        <div className="energy-bar-bg">
          <div className="energy-bar-fill" style={{ width: `${(energy / maxEnergy) * 100}%` }}></div>
        </div>
      </section>

      <nav className="nav-bar">
        <button className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`} onClick={() => setActiveTab('earn')} style={{ background: 'none', border: 'none' }}>
          <Wand2 className="nav-icon" />
          <span>Earn</span>
        </button>
        <button className={`nav-item ${activeTab === 'boosts' ? 'active' : ''}`} onClick={() => setActiveTab('boosts')} style={{ background: 'none', border: 'none' }}>
          <ArrowUpCircle className="nav-icon" />
          <span>Forge</span>
        </button>
        <button className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')} style={{ background: 'none', border: 'none' }}>
          <Users className="nav-icon" />
          <span>Sett</span>
        </button>
        <button className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')} style={{ background: 'none', border: 'none' }}>
          <Wallet className="nav-icon" />
          <span>Vault</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
