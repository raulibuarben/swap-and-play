from django.contrib import admin
from .models import Message, Conversation

# Register your models here.
@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_participants', 'game', 'created_at')
    search_fields = ('participants__username', 'game__title')

    def get_participants(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    get_participants.short_description = 'Participants'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'content', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('sender__username','content', 'conversation__id')