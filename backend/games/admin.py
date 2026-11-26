from django.contrib import admin
from .models import Game

# Register your models here.
@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('title', 'platform', 'owner', 'condition', 'operation_type', 'price', 'is_available', 'created_at')
    list_filter = ('condition', 'operation_type', 'is_available')
    search_fields = ('title', 'platform', 'owner__username')
    ordering = ('-created_at',)