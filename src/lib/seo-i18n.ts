// Localized SEO/GEO copy for the server-rendered entity pages. Every visible
// SEO string (titles, descriptions, intro sentences, FAQ questions/answers,
// section labels) comes from here so the English tree (/...) and the Arabic
// tree (/ar/...) each serve fully localized content. Entity names themselves
// (teams, players, leagues) arrive already localized from the API via the
// `lng` header.

import { Locale, ordinal, formatSeoDate, SITE_NAME } from '@/lib/seo';

const n = (value: number, locale: Locale) =>
  locale === 'ar' ? value.toLocaleString('ar-EG') : value.toLocaleString('en-US');

export interface TeamIntroFacts {
  name: string;
  national?: boolean;
  country?: string;
  founded?: number;
  rank?: number;
  points?: number;
  played?: number;
  leagueName?: string;
  winsInLastFive?: number;
  lastFiveCount?: number;
  nextOpponent?: string;
  nextDate?: string;
  nextLeague?: string;
}

export const seoText = {
  // ---------- Home ----------
  homeTitle(locale: Locale): string {
    return locale === 'ar'
      ? `${SITE_NAME} – نتائج مباشرة لكرة القدم ومواعيد المباريات والفرق وإحصائيات اللاعبين`
      : `${SITE_NAME} – Live Football Scores, Fixtures, Teams & Player Stats`;
  },
  homeDescription(locale: Locale): string {
    return locale === 'ar'
      ? `تابع نتائج كرة القدم المباشرة ومباريات اليوم وجداول الترتيب وتشكيلات الفرق وإحصائيات اللاعبين من الدوريات والبطولات حول العالم على ${SITE_NAME}.`
      : `Follow live football scores, today's fixtures and results, league standings, team squads and player statistics from leagues and cups worldwide on ${SITE_NAME}.`;
  },
  homeIntro(locale: Locale, facts: { date: string; matchCount: number; leagueCount: number; topLeagues: string[] }): string {
    const date = formatSeoDate(facts.date, locale);
    if (!facts.matchCount) {
      return locale === 'ar'
        ? `نتائج مباشرة ومواعيد مباريات كرة القدم ليوم ${date} على ${SITE_NAME}.`
        : `Live football scores, fixtures and results on ${SITE_NAME} for ${date}.`;
    }
    const tops = facts.topLeagues.join(locale === 'ar' ? '، ' : ', ');
    return locale === 'ar'
      ? `نتائج مباشرة ومواعيد مباريات كرة القدم ليوم ${date}: ${n(facts.matchCount, locale)} مباراة في ${n(facts.leagueCount, locale)} بطولة، من بينها ${tops}. تتحدث النتائج لحظة بلحظة على ${SITE_NAME}.`
      : `Live football scores and fixtures for ${date}: ${facts.matchCount} matches across ${facts.leagueCount} competitions, including ${tops}. Scores update in real time on ${SITE_NAME}.`;
  },
  homeIntroLabel(locale: Locale): string {
    return locale === 'ar' ? 'ملخص اليوم' : "Today's overview";
  },

  // ---------- Leagues listing ----------
  leaguesTitle(locale: Locale): string {
    return locale === 'ar' ? 'بطولات وكؤوس كرة القدم حسب الدولة' : 'Football Leagues & Cups by Country';
  },
  leaguesDescription(locale: Locale): string {
    return locale === 'ar'
      ? `تصفح دوريات وبطولات كأس كرة القدم من كل دولة: المباريات وجداول الترتيب والنتائج والهدافون وإحصائيات الموسم على ${SITE_NAME}.`
      : `Browse football leagues and cup competitions from every country: fixtures, standings, results, top scorers and season statistics on ${SITE_NAME}.`;
  },

  // ---------- Team ----------
  teamTitle(locale: Locale, name: string): string {
    return locale === 'ar'
      ? `${name} – التشكيلة والمباريات والنتائج والإحصائيات`
      : `${name} – Squad, Fixtures, Results & Stats`;
  },
  teamDescription(locale: Locale, name: string, country?: string): string {
    return locale === 'ar'
      ? `${name}${country ? ` (${country})` : ''}: نتائج مباشرة ومباريات قادمة وأحدث النتائج والتشكيلة الكاملة وإحصائيات الموسم على ${SITE_NAME}.`
      : `${name}${country ? ` (${country})` : ''}: live scores, upcoming fixtures, latest results, full squad and season statistics on ${SITE_NAME}.`;
  },
  teamIntro(locale: Locale, f: TeamIntroFacts): string {
    const parts: string[] = [];
    if (locale === 'ar') {
      parts.push(
        f.national
          ? `${f.name} منتخب وطني لكرة القدم${f.country ? ` يمثل ${f.country}` : ''}.`
          : `${f.name} نادٍ لكرة القدم${f.country ? ` من ${f.country}` : ''}${f.founded ? `، تأسس عام ${n(f.founded, locale)}` : ''}.`
      );
      if (f.rank && f.leagueName) {
        parts.push(`يحتل ${f.name} حالياً المركز ${n(f.rank, locale)} في ${f.leagueName} برصيد ${n(f.points ?? 0, locale)} نقطة من ${n(f.played ?? 0, locale)} مباراة.`);
      }
      if (f.lastFiveCount && f.lastFiveCount >= 3) {
        parts.push(`فاز الفريق في ${n(f.winsInLastFive ?? 0, locale)} من آخر ${n(f.lastFiveCount, locale)} مباريات.`);
      }
      if (f.nextOpponent && f.nextDate) {
        parts.push(`المباراة القادمة ضد ${f.nextOpponent} يوم ${formatSeoDate(f.nextDate, locale)}${f.nextLeague ? ` في ${f.nextLeague}` : ''}.`);
      }
    } else {
      parts.push(
        `${f.name} is a ${f.national ? 'national football team' : 'football club'}${f.country ? ` from ${f.country}` : ''}${f.founded ? `, founded in ${f.founded}` : ''}.`
      );
      if (f.rank && f.leagueName) {
        parts.push(`${f.name} currently sit ${ordinal(f.rank)} in ${f.leagueName} with ${f.points ?? 0} points from ${f.played ?? 0} matches.`);
      }
      if (f.lastFiveCount && f.lastFiveCount >= 3) {
        parts.push(`They have won ${f.winsInLastFive ?? 0} of their last ${f.lastFiveCount} matches.`);
      }
      if (f.nextOpponent && f.nextDate) {
        parts.push(`Their next fixture is against ${f.nextOpponent} on ${formatSeoDate(f.nextDate, locale)}${f.nextLeague ? ` in the ${f.nextLeague}` : ''}.`);
      }
    }
    return parts.join(' ');
  },
  faqNextMatch(locale: Locale, name: string, opponent: string, date: string, league?: string) {
    return locale === 'ar'
      ? {
          question: `متى المباراة القادمة لفريق ${name}؟`,
          answer: `يلعب ${name} ضد ${opponent} يوم ${formatSeoDate(date, locale)}${league ? ` في ${league}` : ''}.`,
        }
      : {
          question: `When is ${name}'s next match?`,
          answer: `${name} play ${opponent} on ${formatSeoDate(date, locale)}${league ? ` in the ${league}` : ''}.`,
        };
  },
  faqLastResult(locale: Locale, name: string, home: string, goalsHome: number, goalsAway: number, away: string, date: string) {
    const score = `${home} ${n(goalsHome, locale)}–${n(goalsAway, locale)} ${away}`;
    return locale === 'ar'
      ? { question: `ما نتيجة آخر مباراة لفريق ${name}؟`, answer: `${score} يوم ${formatSeoDate(date, locale)}.` }
      : { question: `What was ${name}'s last result?`, answer: `${score} on ${formatSeoDate(date, locale)}.` };
  },
  faqTeamLeague(locale: Locale, name: string, league: string, season: number, rank?: number) {
    return locale === 'ar'
      ? {
          question: `في أي دوري يلعب ${name}؟`,
          answer: `يشارك ${name} في ${league} موسم ${n(season, locale)}${rank ? `، ويحتل حالياً المركز ${n(rank, locale)}` : ''}.`,
        }
      : {
          question: `What league does ${name} play in?`,
          answer: `${name} compete in the ${league} in the ${season} season${rank ? `, where they are currently ${ordinal(rank)}` : ''}.`,
        };
  },
  faqVenue(locale: Locale, name: string, venue: string, city?: string, capacity?: number) {
    return locale === 'ar'
      ? {
          question: `أين يلعب ${name} مبارياته على أرضه؟`,
          answer: `يلعب ${name} مبارياته على ملعب ${venue}${city ? ` في ${city}` : ''}${capacity ? ` بسعة ${n(capacity, locale)} متفرج` : ''}.`,
        }
      : {
          question: `Where do ${name} play their home matches?`,
          answer: `${name} play home matches at ${venue}${city ? ` in ${city}` : ''}${capacity ? `, which has a capacity of ${n(capacity, locale)}` : ''}.`,
        };
  },
  faqFounded(locale: Locale, name: string, year: number) {
    return locale === 'ar'
      ? { question: `متى تأسس ${name}؟`, answer: `تأسس ${name} عام ${n(year, locale)}.` }
      : { question: `When was ${name} founded?`, answer: `${name} was founded in ${year}.` };
  },

  // ---------- Player ----------
  playerTitle(locale: Locale, name: string): string {
    return locale === 'ar' ? `${name} – الملف والإحصائيات والانتقالات` : `${name} – Profile, Stats & Transfers`;
  },
  playerDescription(locale: Locale, name: string, position?: string, team?: string, nationality?: string): string {
    return locale === 'ar'
      ? `${name}${position ? `، ${position}` : ''}${team ? ` مع ${team}` : ''}${nationality ? ` من ${nationality}` : ''}: إحصائيات المسيرة وأداء الموسم وتاريخ الانتقالات على ${SITE_NAME}.`
      : `${name}${position ? `, ${position}` : ''}${team ? ` for ${team}` : ''}${nationality ? ` from ${nationality}` : ''}: career statistics, season performance, and transfer history on ${SITE_NAME}.`;
  },
  playerIntro(
    locale: Locale,
    f: { name: string; position?: string; nationality?: string; team?: string; birthDate?: string; birthPlace?: string; age?: number; apps?: number; goals?: number; assists?: number }
  ): string {
    const parts: string[] = [];
    if (locale === 'ar') {
      parts.push(`${f.name} لاعب كرة قدم${f.position ? ` في مركز ${f.position}` : ''}${f.nationality ? ` من ${f.nationality}` : ''}${f.team ? ` يلعب مع ${f.team}` : ''}.`);
      if (f.birthDate) {
        parts.push(`وُلد ${f.name} في ${formatSeoDate(f.birthDate, locale)}${f.birthPlace ? ` في ${f.birthPlace}` : ''}${f.age ? ` ويبلغ من العمر ${n(f.age, locale)} عاماً` : ''}.`);
      }
      if (f.apps) {
        parts.push(`شارك ${f.name} هذا الموسم في ${n(f.apps, locale)} مباراة وسجل ${n(f.goals ?? 0, locale)} هدفاً وصنع ${n(f.assists ?? 0, locale)} تمريرة حاسمة.`);
      }
    } else {
      parts.push(`${f.name} is a${f.position ? ` ${f.position.toLowerCase()}` : ''} football player${f.nationality ? ` from ${f.nationality}` : ''}${f.team ? ` who plays for ${f.team}` : ''}.`);
      if (f.birthDate) {
        parts.push(`${f.name} was born on ${formatSeoDate(f.birthDate, locale)}${f.birthPlace ? ` in ${f.birthPlace}` : ''}${f.age ? ` and is ${f.age} years old` : ''}.`);
      }
      if (f.apps) {
        parts.push(`This season ${f.name} has made ${f.apps} appearances, scoring ${f.goals ?? 0} goals with ${f.assists ?? 0} assists.`);
      }
    }
    return parts.join(' ');
  },

  // ---------- League ----------
  leagueTitle(locale: Locale, name: string): string {
    return locale === 'ar'
      ? `${name} – المباريات وجدول الترتيب والنتائج والهدافون`
      : `${name} – Fixtures, Table, Results & Top Scorers`;
  },
  leagueDescription(locale: Locale, name: string, country?: string, season?: number): string {
    return locale === 'ar'
      ? `${name}${country ? ` (${country})` : ''}${season ? ` موسم ${n(season, locale)}` : ''}: نتائج مباشرة ومباريات وجدول الترتيب والنتائج وإحصائيات اللاعبين على ${SITE_NAME}.`
      : `${name}${country ? ` (${country})` : ''}${season ? ` ${season} season` : ''}: live scores, fixtures, standings, results and player statistics on ${SITE_NAME}.`;
  },
  leagueIntro(
    locale: Locale,
    f: { name: string; isCup: boolean; country?: string; season?: number; teamCount?: number; leaderName?: string; leaderPoints?: number; leaderPlayed?: number }
  ): string {
    const parts: string[] = [];
    if (locale === 'ar') {
      parts.push(f.isCup ? `${f.name} بطولة كأس لكرة القدم${f.country ? ` في ${f.country}` : ''}.` : `${f.name} دوري لكرة القدم${f.country ? ` في ${f.country}` : ''}.`);
      if (f.season) {
        parts.push(`الموسم الحالي هو ${n(f.season, locale)}${f.teamCount ? ` ويتنافس فيه ${n(f.teamCount, locale)} فريقاً` : ''}.`);
      }
      if (f.leaderName && f.season) {
        parts.push(`يتصدر ${f.leaderName} جدول ${f.name} برصيد ${n(f.leaderPoints ?? 0, locale)} نقطة من ${n(f.leaderPlayed ?? 0, locale)} مباراة.`);
      }
    } else {
      parts.push(`${f.name} is a football ${f.isCup ? 'cup competition' : 'league'}${f.country ? ` in ${f.country}` : ''}.`);
      if (f.season) {
        parts.push(`The current season is ${f.season}${f.teamCount ? `, contested by ${f.teamCount} teams` : ''}.`);
      }
      if (f.leaderName && f.season) {
        parts.push(`${f.leaderName} lead the ${f.name} table with ${f.leaderPoints ?? 0} points from ${f.leaderPlayed ?? 0} matches.`);
      }
    }
    return parts.join(' ');
  },
  faqLeagueLeader(locale: Locale, league: string, team: string, season?: number, points?: number, played?: number) {
    return locale === 'ar'
      ? {
          question: `من يتصدر جدول ${league}؟`,
          answer: `يتصدر ${team} جدول ${league}${season ? ` في موسم ${n(season, locale)}` : ''} برصيد ${n(points ?? 0, locale)} نقطة${played ? ` من ${n(played, locale)} مباراة` : ''}.`,
        }
      : {
          question: `Who is top of the ${league} table?`,
          answer: `${team} are top of the ${league}${season ? ` in the ${season} season` : ''} with ${points ?? 0} points${played ? ` from ${played} matches` : ''}.`,
        };
  },
  faqLeagueTeamCount(locale: Locale, league: string, count: number, season?: number) {
    return locale === 'ar'
      ? {
          question: `كم عدد الفرق في ${league}؟`,
          answer: `يتنافس ${n(count, locale)} فريقاً في ${league}${season ? ` في موسم ${n(season, locale)}` : ''}.`,
        }
      : {
          question: `How many teams play in the ${league}?`,
          answer: `${count} teams are competing in the ${league}${season ? ` in the ${season} season` : ''}.`,
        };
  },
  faqLeagueSeasonDates(locale: Locale, league: string, season: number, start: string, end: string) {
    return locale === 'ar'
      ? {
          question: `متى يبدأ وينتهي موسم ${league}؟`,
          answer: `يمتد موسم ${n(season, locale)} من ${league} من ${formatSeoDate(start, locale)} إلى ${formatSeoDate(end, locale)}.`,
        }
      : {
          question: `When does the ${league} season start and end?`,
          answer: `The ${season} ${league} season runs from ${formatSeoDate(start, locale)} to ${formatSeoDate(end, locale)}.`,
        };
  },

  // ---------- Match ----------
  matchName(locale: Locale, home: string, away: string, goalsHome?: number | null, goalsAway?: number | null): string {
    if (goalsHome != null && goalsAway != null) {
      return `${home} ${n(goalsHome, locale)}–${n(goalsAway, locale)} ${away}`;
    }
    return locale === 'ar' ? `${home} ضد ${away}` : `${home} vs ${away}`;
  },
  matchTitle(locale: Locale, name: string, league?: string, date?: string): string {
    const leaguePart = league || (locale === 'ar' ? 'كرة القدم' : 'Football');
    const datePart = date ? `${locale === 'ar' ? '،' : ','} ${formatSeoDate(date, locale)}` : '';
    return `${name} – ${leaguePart}${datePart}`;
  },
  matchDescription(locale: Locale, home: string, away: string, league?: string, date?: string): string {
    return locale === 'ar'
      ? `${home} ضد ${away}${league ? ` في ${league}` : ''}${date ? ` يوم ${formatSeoDate(date, locale)}` : ''}: النتيجة المباشرة والتشكيلات وأحداث المباراة والإحصائيات والمواجهات السابقة على ${SITE_NAME}.`
      : `${home} vs ${away}${league ? ` in the ${league}` : ''}${date ? ` on ${formatSeoDate(date, locale)}` : ''}: live score, line-ups, match events, statistics and head-to-head on ${SITE_NAME}.`;
  },
  matchIntro(
    locale: Locale,
    f: { home: string; away: string; league?: string; date: string; finished: boolean; goalsHome?: number | null; goalsAway?: number | null; round?: string; venue?: string; venueCity?: string }
  ): string {
    const parts: string[] = [];
    if (locale === 'ar') {
      if (f.finished && f.goalsHome != null && f.goalsAway != null) {
        parts.push(`${f.home} ${n(f.goalsHome, locale)}–${n(f.goalsAway, locale)} ${f.away}: أقيمت هذه المباراة${f.league ? ` ضمن ${f.league}` : ''} يوم ${formatSeoDate(f.date, locale)}.`);
      } else {
        parts.push(`يلعب ${f.home} ضد ${f.away}${f.league ? ` في ${f.league}` : ''} يوم ${formatSeoDate(f.date, locale)}.`);
      }
      if (f.round) parts.push(`المباراة ضمن ${f.round}.`);
      if (f.venue) parts.push(`تقام المباراة على ملعب ${f.venue}${f.venueCity ? ` في ${f.venueCity}` : ''}.`);
    } else {
      if (f.finished && f.goalsHome != null && f.goalsAway != null) {
        parts.push(`${f.home} ${f.goalsHome}–${f.goalsAway} ${f.away}: this ${f.league ?? 'football'} match was played on ${formatSeoDate(f.date, locale)}.`);
      } else {
        parts.push(`${f.home} play ${f.away}${f.league ? ` in the ${f.league}` : ''} on ${formatSeoDate(f.date, locale)}.`);
      }
      if (f.round) parts.push(`The fixture is part of ${f.round}.`);
      if (f.venue) parts.push(`The match takes place at ${f.venue}${f.venueCity ? ` in ${f.venueCity}` : ''}.`);
    }
    return parts.join(' ');
  },

  // ---------- Section labels ----------
  aboutLabel(locale: Locale, name: string): string {
    return locale === 'ar' ? `عن ${name}` : `About ${name}`;
  },
  aboutMatchLabel(locale: Locale): string {
    return locale === 'ar' ? 'عن المباراة' : 'About this match';
  },
  faqTitle(locale: Locale, name: string): string {
    return locale === 'ar' ? `${name} – الأسئلة الشائعة` : `${name} – Frequently Asked Questions`;
  },
  squadTitle(locale: Locale, name: string): string {
    return locale === 'ar' ? `تشكيلة ${name}` : `${name} Squad`;
  },
  competitionsTitle(locale: Locale): string {
    return locale === 'ar' ? 'البطولات' : 'Competitions';
  },
  teamMatchesTitle(locale: Locale, name: string): string {
    return locale === 'ar' ? `مباريات ${name}` : `${name} Matches`;
  },
  leagueTeamsTitle(locale: Locale, name: string, season?: number): string {
    return locale === 'ar'
      ? `فرق ${name}${season ? ` (${n(season, locale)})` : ''}`
      : `${name} Teams${season ? ` (${season})` : ''}`;
  },
  playerTeamsTitle(locale: Locale, name: string): string {
    return locale === 'ar' ? `${name} – الفرق` : `${name} – Teams`;
  },
  matchLinksTitle(locale: Locale): string {
    return locale === 'ar' ? 'الفريقان والبطولة' : 'Teams & Competition';
  },
};
