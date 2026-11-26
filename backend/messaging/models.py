from django.db import models
from django.conf import settings

# Create your models here.
class Conversation(models.Model):
    # Participantes de la conversación y juego asociado
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations')

    game = models.ForeignKey(
        'games.Game',
        on_delete=models.SET_NULL,
        related_name='conversations',
        null=True,
        blank=True,
    )

    # Control temporal de la conversación
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        users = ', '.join([user.username for user in self.participants.all()])
        return f"Conversation between {users} about {self.game.title if self.game else 'No game'}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"    