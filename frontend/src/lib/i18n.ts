/**
 * Simple i18n system for YeWaledoch
 * Amharic-first, English fallback
 */

import { create } from 'zustand';

export type Language = 'am' | 'en';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: (localStorage.getItem('language') as Language) || 'am',
  setLanguage: (language) => {
    localStorage.setItem('language', language);
    set({ language });
  },
}));

const translations: Record<Language, Record<string, string>> = {
  am: {
    // Navigation
    'nav.home': 'መነሻ',
    'nav.topics': 'ርዕሶች',
    'nav.write': 'ጻፍ',
    'nav.alerts': 'ማሳወቂያ',
    'nav.me': 'እኔ',

    // Common buttons
    'btn.save': 'አስቀምጥ',
    'btn.cancel': 'ሰርዝ',
    'btn.delete': 'ሰርዝ',
    'btn.edit': 'አስተካክል',
    'btn.share': 'አጋራ',
    'btn.report': 'አመልክት',
    'btn.reply': 'መልስ',
    'btn.submit': 'ላክ',
    'btn.load_more': 'ተጨማሪ ጫን',
    'btn.retry': 'እንደገና ሞክር',
    'btn.back': 'ተመለስ',
    'btn.login': 'ግባ',
    'btn.see_all': 'ሁሉንም ይመልከቱ',

    // Post types
    'post_type.curated': 'የተመረጠ',
    'post_type.question': 'ጥያቄ',
    'post_type.tip': 'ምክር',
    'post_type.story': 'ልምድ',
    'post_type.discussion': 'ውይይት',
    'post_type.expert_answer': 'የባለሙያ መልስ',

    // Categories
    'cat.pregnancy': 'እርግዝና',
    'cat.newborn': 'አራስ',
    'cat.toddler': 'ጨቅላ',
    'cat.school_age': 'የትምህርት ዕድሜ',
    'cat.teens': 'ታዳጊ',
    'cat.health': 'ጤና',
    'cat.nutrition': 'ስነ-ምግብ',
    'cat.dads': 'አባቶች',
    'cat.mental_health': 'የአዕምሮ ጤና',
    'cat.special_needs': 'ልዩ ፍላጎት',
    'cat.education': 'ትምህርት',
    'cat.fun_activities': 'መዝናኛ',

    // Empty states
    'empty.posts': 'ምንም ጽሑፍ የለም',
    'empty.comments': 'ምንም አስተያየት የለም',
    'empty.notifications': 'ምንም ማሳወቂያ የለም',
    'empty.saved': 'ምንም የተቀመጠ ጽሑፍ የለም',
    'empty.children': 'ምንም ልጅ አልተመዘገበም',

    // Error messages
    'error.generic': 'ችግር ተፈጥሯል',
    'error.network': 'የበይነመረብ ችግር',
    'error.auth': 'ማረጋገጥ አልተሳካም',
    'error.not_found': 'አልተገኘም',
    'error.forbidden': 'ፈቃድ የለዎትም',

    // Auth
    'auth.telegram_only': 'ይህ መተግበሪያ በቴሌግራም ብቻ ይሰራል',
    'auth.open_telegram': 'በቴሌግራም ክፈት',

    // Profile
    'profile.my_posts': 'ጽሑፎቼ',
    'profile.saved_posts': 'የተቀመጡ',
    'profile.my_children': 'ልጆቼ',
    'profile.settings': 'ቅንብሮች',
    'profile.language': 'ቋንቋ',
    'profile.logout': 'ውጣ',
    'profile.resources': 'መረጃዎች',
    'profile.posts_count': 'ጽሑፎች',
    'profile.comments_count': 'አስተያየቶች',
    'profile.reputation_count': 'ነጥብ',
    'profile.add_child': 'ልጅ ጨምር',
    'profile.edit_profile': 'መገለጫ አስተካክል',
    'profile.role.mother': 'እናት',
    'profile.role.father': 'አባት',
    'profile.role.guardian': 'አሳዳጊ',
    'profile.role.expecting': 'ነፍሰ ጡር',
    'profile.years_old': 'ዓመት',
    'profile.months_old': 'ወር',
    'profile.boy': 'ወንድ',
    'profile.girl': 'ሴት',

    // Child
    'child.name': 'ስም',
    'child.dob': 'የልደት ቀን',
    'child.gender': 'ፆታ',
    'child.vaccinations': 'ክትባቶች',
    'child.milestones': 'ብቃቶች',
    'child.delete_confirm': 'ይህንን ልጅ ለመሰረዝ እርግጠኛ ኖት?',
    'child.overdue': 'ያለፈ',
    'child.upcoming': 'ቀጣይ',
    'child.completed': 'ተጠናቋል',
    'child.pending': 'ይጠበቃል',
    'child.mark_done': 'ተደርጓል',
    'child.at_birth': 'በልደት',
    'child.weeks': 'ሳምንት',
    'child.log_milestone': 'ብቃት መዝግብ',

    // Notifications
    'notif.mark_all_read': 'ሁሉንም ያንብቡ',
    'notif.today': 'ዛሬ',
    'notif.yesterday': 'ትላንት',
    'notif.this_week': 'በዚህ ሳምንት',
    'notif.earlier': 'ቀደም ሲል',
    'notif.empty': 'ገና ማሳወቂያ የለም',

    // Settings
    'settings.title': 'ቅንብሮች',
    'settings.language': 'ቋንቋ',
    'settings.notifications': 'ማሳወቂያ ቅንብሮች',
    'settings.notify_likes': 'ለእውድ ማሳወቂያ',
    'settings.notify_comments': 'ለአስተያየት ማሳወቂያ',
    'settings.notify_replies': 'ለመልስ ማሳወቂያ',
    'settings.edit_profile': 'መገለጫ አስተካክል',
    'settings.name': 'ስም',
    'settings.city': 'ከተማ',
    'settings.parenting_role': 'ሚና',
    'settings.about': 'ስለ የወላጆች',
    'settings.about_text': 'የኢትዮጵያ ወላጆች ማህበረሰብ — ልምድ ይጋሩ፣ ምክር ያግኙ',
    'settings.help': 'እገዛ እና አስተያየት',
    'settings.version': 'ስሪት',
    'settings.phone': 'ስልክ ቁጥር',
    'settings.share_phone': 'ስልክ ቁጥር አጋራ',
    'settings.phone_shared': 'ስልክ ቁጥር ተጋርቷል',
    'settings.phone_required': 'ለመጻፍ ስልክ ቁጥር ያስፈልጋል',

    // Resources
    'resources.title': 'መረጃዎች',
    'resources.vaccines': 'የክትባት መርሐግብር',
    'resources.recipes': 'የህፃናት ምግብ',
    'resources.emergency': 'የአደጋ ጊዜ ስልክ',
    'resources.milestones_guide': 'የብቃት መመሪያ',
    'resources.pregnancy_guide': 'የእርግዝና መመሪያ',

    // Write
    'write.title_placeholder': 'ርዕስ...',
    'write.body_placeholder': 'ይጻፉ...',
    'write.select_category': 'ምድብ ይምረጡ',
    'write.select_type': 'ዓይነት ይምረጡ',
    'write.contributors_only': 'ጽሑፍ ለመጻፍ ተጨማሪ አስተያየት ያስፈልጋል',
    'write.create_post': 'ጽሑፍ ጻፍ',
    'write.title_label': 'ርዕስ',
    'write.body_label': 'ይዘት',
    'write.age_group': 'የዕድሜ ክልል',
    'write.age_all': 'ሁሉም',
    'write.age_0_1': '0-1',
    'write.age_1_3': '1-3',
    'write.age_4_12': '4-12',
    'write.age_13_18': '13-18',
    'write.images': 'ፎቶዎች (ከ3 ያልበለጠ)',
    'write.tags': 'መለያዎች',
    'write.tags_placeholder': 'በኮማ ይለዩ (ከ5 ያልበለጠ)',
    'write.discussion_prompt': 'የውይይት ጥያቄ',
    'write.discussion_placeholder': 'ውይይት ለመጀመር ጥያቄ ይጠይቁ...',
    'write.preview': 'ቅድመ ዕይታ',
    'write.back_to_edit': 'ወደ ማስተካከያ ተመለስ',
    'write.error_type': 'ዓይነት ይምረጡ',
    'write.error_title': 'ርዕስ ያስፈልጋል',
    'write.error_title_long': 'ርዕስ ከ300 ቁምፊ መብለጥ አይገባም',
    'write.error_category': 'ምድብ ይምረጡ',
    'write.error_body': 'ይዘት ያስፈልጋል',
    'write.locked_title': 'ገና ጽሑፍ ማጻፍ አይችሉም',
    'write.locked_subtitle': 'አስተያየት መስጠት ይጀምሩ! 10 አስተያየቶች ሲደርሱ ጽሑፍ ማጻፍ ይችላሉ',
    'write.progress_comments': 'አስተያየቶች',
    'write.keep_engaging': 'አስተያየት መስጠት ይቀጥሉ!',
    'write.almost_there': 'ደረሱ! ገጹን ያድሱ',

    // Topics
    'topics.subtitle': 'በርዕስ ያስሱ',
    'topics.empty_category': 'በዚህ ምድብ ገና ምንም ጽሑፍ የለም',

    // Sort
    'sort.latest': 'ዘመናዊ',
    'sort.popular': 'ተወዳጅ',
    'sort.discussed': 'ውይይት',

    // Home
    'home.search_placeholder': 'ፈልግ...',
    'home.empty_subtitle': 'ገና ምንም ልጥፍ የለም። በቅርቡ ይመለሱ!',

    // Post
    'post.anonymous': 'ስም አልባ',
    'post.reputation': 'ነጥብ',
    'post.saved': 'ተቀምጧል',
    'post.unsaved': 'ተነስቷል',
    'post.updated': 'ተዘምኗል',
    'post.link_copied': 'ሊንክ ተቀድቷል',
    'post.source_from': 'የተተረጎመ ከ',

    // Comments
    'comment.title': 'አስተያየቶች',
    'comment.placeholder': 'አስተያየት ይጻፉ...',
    'comment.reply_placeholder': 'መልስ ይጻፉ...',
    'comment.anonymous_toggle': 'በስም ሳይገለጽ ጻፍ',
    'comment.members_only': 'ለመጻፍ መግባት ያስፈልጋል',

    // Report
    'report.confirm': 'ይህን ሪፖርት ማድረግ ይፈልጋሉ?',
    'report.submitted': 'ሪፖርት ተልኳል',

    // Misc
    'app.name': 'የወላጆች',
    'app.tagline': 'የኢትዮጵያ ወላጆች ማህበረሰብ',
    'time.just_now': 'አሁን',
    'time.minutes_ago': 'ደቂቃ በፊት',
    'time.hours_ago': 'ሰዓት በፊት',
    'time.days_ago': 'ቀን በፊት',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.topics': 'Topics',
    'nav.write': 'Write',
    'nav.alerts': 'Alerts',
    'nav.me': 'Me',

    // Common buttons
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.delete': 'Delete',
    'btn.edit': 'Edit',
    'btn.share': 'Share',
    'btn.report': 'Report',
    'btn.reply': 'Reply',
    'btn.submit': 'Submit',
    'btn.load_more': 'Load More',
    'btn.retry': 'Retry',
    'btn.back': 'Back',
    'btn.login': 'Login',
    'btn.see_all': 'See All',

    // Post types
    'post_type.curated': 'Curated',
    'post_type.question': 'Question',
    'post_type.tip': 'Tip',
    'post_type.story': 'Story',
    'post_type.discussion': 'Discussion',
    'post_type.expert_answer': 'Expert Answer',

    // Categories
    'cat.pregnancy': 'Pregnancy',
    'cat.newborn': 'Newborn',
    'cat.toddler': 'Toddler',
    'cat.school_age': 'School Age',
    'cat.teens': 'Teens',
    'cat.health': 'Health',
    'cat.nutrition': 'Nutrition',
    'cat.dads': 'Dads',
    'cat.mental_health': 'Mental Health',
    'cat.special_needs': 'Special Needs',
    'cat.education': 'Education',
    'cat.fun_activities': 'Fun Activities',

    // Empty states
    'empty.posts': 'No posts yet',
    'empty.comments': 'No comments yet',
    'empty.notifications': 'No notifications',
    'empty.saved': 'No saved posts',
    'empty.children': 'No children registered',

    // Error messages
    'error.generic': 'Something went wrong',
    'error.network': 'Network error',
    'error.auth': 'Authentication failed',
    'error.not_found': 'Not found',
    'error.forbidden': 'Access denied',

    // Auth
    'auth.telegram_only': 'This app only works inside Telegram',
    'auth.open_telegram': 'Open in Telegram',

    // Profile
    'profile.my_posts': 'My Posts',
    'profile.saved_posts': 'Saved',
    'profile.my_children': 'My Children',
    'profile.settings': 'Settings',
    'profile.language': 'Language',
    'profile.logout': 'Logout',
    'profile.resources': 'Resources',
    'profile.posts_count': 'Posts',
    'profile.comments_count': 'Comments',
    'profile.reputation_count': 'Points',
    'profile.add_child': 'Add Child',
    'profile.edit_profile': 'Edit Profile',
    'profile.role.mother': 'Mother',
    'profile.role.father': 'Father',
    'profile.role.guardian': 'Guardian',
    'profile.role.expecting': 'Expecting',
    'profile.years_old': 'yrs',
    'profile.months_old': 'mo',
    'profile.boy': 'Boy',
    'profile.girl': 'Girl',

    // Child
    'child.name': 'Name',
    'child.dob': 'Date of Birth',
    'child.gender': 'Gender',
    'child.vaccinations': 'Vaccinations',
    'child.milestones': 'Milestones',
    'child.delete_confirm': 'Are you sure you want to remove this child?',
    'child.overdue': 'Overdue',
    'child.upcoming': 'Upcoming',
    'child.completed': 'Completed',
    'child.pending': 'Pending',
    'child.mark_done': 'Mark Done',
    'child.at_birth': 'At Birth',
    'child.weeks': 'weeks',
    'child.log_milestone': 'Log Milestone',

    // Notifications
    'notif.mark_all_read': 'Mark all read',
    'notif.today': 'Today',
    'notif.yesterday': 'Yesterday',
    'notif.this_week': 'This Week',
    'notif.earlier': 'Earlier',
    'notif.empty': 'No notifications yet',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.notifications': 'Notification Settings',
    'settings.notify_likes': 'Like notifications',
    'settings.notify_comments': 'Comment notifications',
    'settings.notify_replies': 'Reply notifications',
    'settings.edit_profile': 'Edit Profile',
    'settings.name': 'Name',
    'settings.city': 'City',
    'settings.parenting_role': 'Role',
    'settings.about': 'About YeWaledoch',
    'settings.about_text': 'Ethiopian Parenting Community — share experiences, get advice',
    'settings.help': 'Help & Feedback',
    'settings.version': 'Version',
    'settings.phone': 'Phone Number',
    'settings.share_phone': 'Share Phone Number',
    'settings.phone_shared': 'Phone number shared',
    'settings.phone_required': 'Phone number required to post',

    // Resources
    'resources.title': 'Resources',
    'resources.vaccines': 'Vaccination Schedule',
    'resources.recipes': 'Baby Food Recipes',
    'resources.emergency': 'Emergency Contacts',
    'resources.milestones_guide': 'Milestone Guide',
    'resources.pregnancy_guide': 'Pregnancy Guide',

    // Write
    'write.title_placeholder': 'Title...',
    'write.body_placeholder': 'Write...',
    'write.select_category': 'Select category',
    'write.select_type': 'Select type',
    'write.contributors_only': 'You need more comments to create posts',
    'write.create_post': 'Create Post',
    'write.title_label': 'Title',
    'write.body_label': 'Content',
    'write.age_group': 'Age Group',
    'write.age_all': 'All',
    'write.age_0_1': '0-1',
    'write.age_1_3': '1-3',
    'write.age_4_12': '4-12',
    'write.age_13_18': '13-18',
    'write.images': 'Photos (up to 3)',
    'write.tags': 'Tags',
    'write.tags_placeholder': 'Comma-separated (max 5)',
    'write.discussion_prompt': 'Discussion prompt',
    'write.discussion_placeholder': 'Ask a question to spark discussion...',
    'write.preview': 'Preview',
    'write.back_to_edit': 'Back to editing',
    'write.error_type': 'Select a post type',
    'write.error_title': 'Title is required',
    'write.error_title_long': 'Title must be under 300 characters',
    'write.error_category': 'Select a category',
    'write.error_body': 'Content is required',
    'write.locked_title': "You can't create posts yet",
    'write.locked_subtitle': 'Start commenting! You can create posts after 10 comments',
    'write.progress_comments': 'Comments',
    'write.keep_engaging': 'Keep commenting to unlock!',
    'write.almost_there': "You're there! Refresh the page",

    // Topics
    'topics.subtitle': 'Browse by topic',
    'topics.empty_category': 'No posts in this category yet',

    // Sort
    'sort.latest': 'Latest',
    'sort.popular': 'Popular',
    'sort.discussed': 'Discussed',

    // Home
    'home.search_placeholder': 'Search...',
    'home.empty_subtitle': 'No posts yet. Check back soon!',

    // Post
    'post.anonymous': 'Anonymous',
    'post.reputation': 'points',
    'post.saved': 'Saved',
    'post.unsaved': 'Removed from saved',
    'post.updated': 'Post updated',
    'post.link_copied': 'Link copied',
    'post.source_from': 'Translated from',

    // Comments
    'comment.title': 'Comments',
    'comment.placeholder': 'Write a comment...',
    'comment.reply_placeholder': 'Write a reply...',
    'comment.anonymous_toggle': 'Post anonymously',
    'comment.members_only': 'Log in to comment',

    // Report
    'report.confirm': 'Are you sure you want to report this?',
    'report.submitted': 'Report submitted',

    // Misc
    'app.name': 'YeWaledoch',
    'app.tagline': 'Ethiopian Parenting Community',
    'time.just_now': 'just now',
    'time.minutes_ago': 'min ago',
    'time.hours_ago': 'hr ago',
    'time.days_ago': 'd ago',
  },
};

export function useTranslation() {
  const { language, setLanguage } = useI18nStore();

  const t = (key: string): string => {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };

  return { t, language, setLanguage };
}
